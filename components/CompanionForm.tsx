"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompanion } from "@/lib/actions/companion.actions";
import { useRouter } from "next/navigation";

/**
 * 1) Schema: coerce to number so browser strings => number
 */
const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    subject: z.string().min(1, "Subject is required"),
    topic: z.string().min(1, "Topic is required"),
    voice: z.string().min(1, "Voice is required"),
    style: z.string().min(1, "Style is required"),
    duration: z.coerce.number().min(1, "Duration must be at least 1"),
});

/**
 * 2) Single source of truth for form types
 */
type FormValues = z.infer<typeof formSchema>;

/**
 * 3) Create resolver and assert its type explicitly
 */
const typedResolver = zodResolver(formSchema) as unknown as Resolver<FormValues, any>;

export default function CompanionForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: typedResolver,
        defaultValues: {
            name: "",
            subject: "",
            topic: "",
            voice: "",
            style: "",
            duration: 30,
        },
    });

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        try {
            setError(null);

            // Call the server action to create companion
            const companion = await createCompanion(values);

            if (companion && companion.id) {
                // Reset form
                reset();

                // Redirect to the newly created companion page
                router.push(`/companions/${companion.id}`);
            }
        } catch (err) {
            console.error("Error creating companion:", err);
            setError(err instanceof Error ? err.message : "Failed to create companion");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Companion Name</span>
                <input
                    {...register("name")}
                    className="rounded-4xl border border-black bg-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="e.g., Math Master Mike"
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </label>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Subject</span>
                <select
                    {...register("subject")}
                    className="rounded-4xl border border-black bg-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-black/20 appearance-none"
                >
                    <option value="">Select subject</option>
                    <option value="maths">Maths</option>
                    <option value="science">Science</option>
                    <option value="language">Language</option>
                    <option value="history">History</option>
                    <option value="coding">Coding</option>
                    <option value="economics">Economics</option>
                </select>
                {errors.subject && <p className="text-red-500 text-sm">{errors.subject.message}</p>}
            </label>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Topic</span>
                <textarea
                    {...register("topic")}
                    className="rounded-4xl border border-black bg-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-black/20 resize-none min-h-[80px]"
                    placeholder="e.g., Derivatives & Integrals"
                    rows={3}
                />
                {errors.topic && <p className="text-red-500 text-sm">{errors.topic.message}</p>}
            </label>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Voice</span>
                <select
                    {...register("voice")}
                    className="rounded-4xl border border-black bg-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-black/20 appearance-none"
                >
                    <option value="">Select voice</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>
                {errors.voice && <p className="text-red-500 text-sm">{errors.voice.message}</p>}
            </label>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Teaching Style</span>
                <select
                    {...register("style")}
                    className="rounded-4xl border border-black bg-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-black/20 appearance-none"
                >
                    <option value="">Select style</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                </select>
                {errors.style && <p className="text-red-500 text-sm">{errors.style.message}</p>}
            </label>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Duration (minutes)</span>
                <Controller
                    name="duration"
                    control={control}
                    render={({ field }) => (
                        <input
                            type="number"
                            min={1}
                            {...field}
                            className="rounded-4xl border border-black bg-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-black/20"
                        />
                    )}
                />
                {errors.duration && <p className="text-red-500 text-sm">{errors.duration.message}</p>}
            </label>

            <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center mt-4"
            >
                {isSubmitting ? "Creating..." : "Create Companion"}
            </button>
        </form>
    );
}