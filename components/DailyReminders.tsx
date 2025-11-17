'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { saveLearningReminders } from "@/lib/actions/companion.actions";
import { useRouter } from "next/navigation";

interface DailyRemindersProps {
    initialSettings?: {
        enabled: boolean;
        time: string;
        frequency: 'daily' | 'weekdays' | 'custom';
        customDays?: string[];
    };
}

const DailyReminders = ({ initialSettings }: DailyRemindersProps) => {
    const router = useRouter();
    const [enabled, setEnabled] = useState(initialSettings?.enabled ?? false);
    const [time, setTime] = useState(initialSettings?.time ?? '09:00');
    const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'custom'>(
        initialSettings?.frequency ?? 'daily'
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Sync with initialSettings when they change
    useEffect(() => {
        if (initialSettings) {
            setEnabled(initialSettings.enabled);
            setTime(initialSettings.time || '09:00');
            setFrequency(initialSettings.frequency || 'daily');
        }
    }, [initialSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaved(false);

        try {
            console.log('💾 Saving reminder settings:', { enabled, time, frequency });

            await saveLearningReminders({
                enabled,
                time,
                frequency,
            });

            console.log('✅ Reminder settings saved successfully');
            setSaved(true);
            router.refresh();

            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('❌ Failed to save reminders:', error);
            alert('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save when enabled/disabled
    const handleToggle = async (newEnabled: boolean) => {
        setEnabled(newEnabled);
        setIsSaving(true);

        try {
            console.log('🔄 Auto-saving toggle state:', newEnabled);

            await saveLearningReminders({
                enabled: newEnabled,
                time,
                frequency,
            });

            console.log('✅ Toggle state saved');
            router.refresh();
        } catch (error) {
            console.error('❌ Failed to save toggle:', error);
            // Revert on error
            setEnabled(!newEnabled);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="border-2 border-primary/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span>📅</span>
                            Daily Learning Reminders
                        </CardTitle>
                        <CardDescription>
                            Get notified to maintain your learning streak
                        </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="reminders-toggle"
                            checked={enabled}
                            onCheckedChange={handleToggle}
                            disabled={isSaving}
                        />
                        <Label htmlFor="reminders-toggle" className="cursor-pointer">
                            {enabled ? 'On' : 'Off'}
                        </Label>
                    </div>
                </div>
            </CardHeader>

            {enabled && (
                <CardContent className="space-y-6">
                    {/* Time Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="reminder-time">Reminder Time</Label>
                        <input
                            id="reminder-time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Choose when you'd like to receive your daily reminder
                        </p>
                    </div>

                    {/* Frequency Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="reminder-frequency">Frequency</Label>
                        <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                            <SelectTrigger id="reminder-frequency">
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Every Day</SelectItem>
                                <SelectItem value="weekdays">Weekdays Only</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {frequency === 'daily' && 'Get reminders 7 days a week'}
                            {frequency === 'weekdays' && 'Get reminders Monday through Friday'}
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="rounded-lg border border-muted bg-muted/50 p-4">
                        <p className="text-sm font-medium mb-2">Preview:</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="text-2xl">🔔</span>
                            <div>
                                <p className="font-medium text-foreground">
                                    Time to learn with Thuto!
                                </p>
                                <p className="text-xs">
                                    Your daily learning session at {formatTime(time)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1"
                        >
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </Button>
                        {saved && (
                            <span className="text-sm text-green-600 font-medium">
                                ✓ Saved!
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        💡 Note: Reminders will be sent via email. Make sure your email preferences are configured.
                    </p>
                </CardContent>
            )}
        </Card>
    );
};

function formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

export default DailyReminders;