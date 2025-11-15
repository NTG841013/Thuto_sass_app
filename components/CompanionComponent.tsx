'use client';

import {useEffect, useRef, useState} from 'react'
import {cn, configureAssistant, getSubjectColor} from "@/lib/utils";
import {vapi} from "@/lib/vapi.sdk";
import Image from "next/image";
import Lottie, {LottieRefCurrentProps} from "lottie-react";
import soundwaves from '@/constants/soundwaves.json'
import {addToSessionHistory, saveConversationHistory} from "@/lib/actions/companion.actions";

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

const CompanionComponent = ({ companionId, subject, topic, name, userName, userImage, style, voice }: CompanionComponentProps) => {
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [messages, setMessages] = useState<SavedMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);

    // ✅ Use a ref to store messages so they're not lost during state updates
    const messagesRef = useRef<SavedMessage[]>([]);

    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const isConnectingRef = useRef(false);

    useEffect(() => {
        if(lottieRef.current) {
            if(isSpeaking) {
                lottieRef.current.play()
            } else {
                lottieRef.current.stop()
            }
        }
    }, [isSpeaking]);

    useEffect(() => {
        const onCallStart = () => {
            console.log('✅ Call started successfully');
            setCallStatus(CallStatus.ACTIVE);
            setError(null);
            isConnectingRef.current = false;
            setCallStartTime(Date.now());
        };

        const onCallEnd = async () => {
            console.log('✅ Call ended successfully');
            setCallStatus(CallStatus.FINISHED);
            isConnectingRef.current = false;

            // Calculate call duration in seconds
            const duration = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0;

            // ✅ Use messagesRef to get the actual messages, not state
            const savedMessages = messagesRef.current;

            console.log('📊 Call ended with:', {
                duration,
                messageCount: savedMessages.length,
                companionId,
            });

            try {
                // Add to session history and get the session ID
                console.log('💾 Saving session history...');
                const session = await addToSessionHistory(companionId);
                console.log('✅ Session history saved:', session);

                const currentSessionId = session?.[0]?.id;

                if (!currentSessionId) {
                    console.error('❌ No session ID returned from addToSessionHistory');
                    return;
                }

                // Save conversation history if there are messages
                if (savedMessages.length > 0) {
                    console.log('💾 Saving conversation history...', {
                        sessionId: currentSessionId,
                        companionId,
                        messageCount: savedMessages.length,
                        duration,
                    });

                    await saveConversationHistory({
                        sessionId: currentSessionId,
                        companionId,
                        messages: savedMessages,
                        duration,
                    });

                    console.log('✅ Conversation saved successfully with', savedMessages.length, 'messages');
                } else {
                    console.warn('⚠️ No messages to save');
                }
            } catch (err) {
                console.error('❌ Failed to save conversation:', err);
                setError('Failed to save conversation history');
            }
        }

        const onMessage = (message: Message) => {
            if(message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage = { role: message.role, content: message.transcript }
                setMessages((prev) => {
                    const updated = [newMessage, ...prev];
                    messagesRef.current = updated; // ✅ Also update ref
                    return updated;
                });
            }
        }

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);

        const onError = (error: Error) => {
            // Ignore transport disconnection errors (normal behavior when call ends)
            const errorMessage = error.message || error.toString();
            if (errorMessage.includes('transport') && errorMessage.includes('disconnected')) {
                console.log('ℹ️ Transport disconnected (call ended normally)');
                return;
            }

            console.error('❌ VAPI Error:', error);
            setError(error.message || 'An error occurred with the voice assistant');
            setCallStatus(CallStatus.INACTIVE);
            isConnectingRef.current = false;
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('error', onError);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('message', onMessage);
            vapi.off('error', onError);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
        }
    }, [companionId]);

    const toggleMicrophone = () => {
        if (callStatus !== CallStatus.ACTIVE) return;

        try {
            const currentlyMuted = vapi.isMuted();
            vapi.setMuted(!currentlyMuted);
            setIsMuted(!currentlyMuted);
        } catch (err) {
            console.error('Error toggling microphone:', err);
            setError('Failed to toggle microphone');
        }
    }

    const handleCall = async () => {
        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('Already connecting, ignoring duplicate call');
            return;
        }

        try {
            setError(null);
            setCallStatus(CallStatus.CONNECTING);
            isConnectingRef.current = true;

            console.log('Starting call with config:', { subject, topic, style, voice });

            const assistantConfig = configureAssistant(voice, style);

            const assistantOverrides = {
                variableValues: { subject, topic, style },
                clientMessages: ["transcript"],
                serverMessages: [],
            };

            console.log('Assistant config:', assistantConfig);
            console.log('Assistant overrides:', assistantOverrides);

            // Start the VAPI call
            await vapi.start(assistantConfig, assistantOverrides);

        } catch (err) {
            console.error('Error starting call:', err);
            setError(err instanceof Error ? err.message : 'Failed to start session');
            setCallStatus(CallStatus.INACTIVE);
            isConnectingRef.current = false;
        }
    }

    const handleDisconnect = () => {
        try {
            console.log('🛑 User manually disconnected');
            console.log('📊 Current state:', {
                messageCount: messages.length,
                callStartTime,
                duration: callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0,
            });
            setCallStatus(CallStatus.FINISHED);
            vapi.stop();
            isConnectingRef.current = false;
        } catch (err) {
            console.error('Error stopping call:', err);
        }
    }

    // Debug function to check current state
    const logCurrentState = () => {
        console.log('🔍 Current Component State:', {
            callStatus,
            messageCount: messages.length,
            messagesRefCount: messagesRef.current.length, // ✅ Also log ref count
            messages: messages,
            messagesRef: messagesRef.current,
            companionId,
            callStartTime,
            duration: callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0,
        });
    };

    return (
        <section className="flex flex-col h-[70vh]">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    <p className="font-semibold">Error:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <section className="flex gap-8 max-sm:flex-col">
                <div className="companion-section">
                    <div className="companion-avatar" style={{ backgroundColor: getSubjectColor(subject)}}>
                        <div
                            className={
                                cn(
                                    'absolute transition-opacity duration-1000',
                                    callStatus === CallStatus.FINISHED || callStatus === CallStatus.INACTIVE ? 'opacity-100' : 'opacity-0',
                                    callStatus === CallStatus.CONNECTING && 'opacity-100 animate-pulse'
                                )
                            }>
                            <Image
                                src={`/icons/${subject}.svg`}
                                alt={subject}
                                width={150}
                                height={150}
                                className="max-sm:w-fit"
                            />
                        </div>

                        <div className={cn('absolute transition-opacity duration-1000', callStatus === CallStatus.ACTIVE ? 'opacity-100': 'opacity-0')}>
                            <Lottie
                                lottieRef={lottieRef}
                                animationData={soundwaves}
                                autoplay={false}
                                className="companion-lottie"
                            />
                        </div>
                    </div>
                    <p className="font-bold text-2xl">{name}</p>
                    {callStatus === CallStatus.CONNECTING && (
                        <p className="text-sm text-gray-600">Connecting to voice assistant...</p>
                    )}
                </div>

                <div className="user-section">
                    <div className="user-avatar">
                        <Image
                            src={userImage}
                            alt={userName}
                            width={130}
                            height={130}
                            className="rounded-lg"
                        />
                        <p className="font-bold text-2xl">
                            {userName}
                        </p>
                    </div>
                    <button
                        className="btn-mic"
                        onClick={toggleMicrophone}
                        disabled={callStatus !== CallStatus.ACTIVE}
                    >
                        <Image
                            src={isMuted ? '/icons/mic-off.svg' : '/icons/mic-on.svg'}
                            alt="mic"
                            width={36}
                            height={36}
                        />
                        <p className="max-sm:hidden">
                            {isMuted ? 'Turn on microphone' : 'Turn off microphone'}
                        </p>
                    </button>
                    <button
                        className={cn(
                            'rounded-lg py-2 cursor-pointer transition-colors w-full text-white',
                            callStatus === CallStatus.ACTIVE ? 'bg-red-700' : 'bg-primary',
                            callStatus === CallStatus.CONNECTING && 'animate-pulse opacity-75 cursor-not-allowed'
                        )}
                        onClick={callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall}
                        disabled={callStatus === CallStatus.CONNECTING}
                    >
                        {callStatus === CallStatus.ACTIVE
                            ? "End Session"
                            : callStatus === CallStatus.CONNECTING
                                ? 'Connecting...'
                                : 'Start Session'
                        }
                    </button>
                </div>
            </section>

            <section className="transcript">
                {/* Debug info - Remove in production */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-500 mb-2">
                        Debug: {messages.length} messages | Status: {callStatus} | Duration: {callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0}s
                        <button onClick={logCurrentState} className="ml-2 underline">Log State</button>
                    </div>
                )}

                <div className="transcript-message no-scrollbar">
                    {messages.length === 0 && callStatus === CallStatus.ACTIVE && (
                        <p className="text-gray-500 text-center">Conversation will appear here...</p>
                    )}
                    {messages.map((message, index) => {
                        if(message.role === 'assistant') {
                            return (
                                <p key={index} className="max-sm:text-sm">
                                    {name.split(' ')[0].replace(/[.,]/g, '')}: {message.content}
                                </p>
                            )
                        } else {
                            return (
                                <p key={index} className="text-primary max-sm:text-sm">
                                    {userName}: {message.content}
                                </p>
                            )
                        }
                    })}
                </div>

                <div className="transcript-fade" />
            </section>
        </section>
    )
}

export default CompanionComponent