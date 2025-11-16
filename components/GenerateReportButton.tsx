'use client';

import { useState } from "react";
import { generateMonthlyReport } from "@/lib/actions/companion.actions";
import { useRouter } from "next/navigation";

const GenerateReportButton = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            await generateMonthlyReport(currentMonth, currentYear);
            router.refresh();
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary text-sm"
        >
            {isGenerating ? 'Generating...' : 'Generate Current Month Report'}
        </button>
    );
};

export default GenerateReportButton;