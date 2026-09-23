"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { IMedication, addMedication, deleteMedication } from "@/db/medications";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export default function MedicationsSection({
    elderId,
    initialMedications,
}: {
    elderId: string;
    initialMedications: IMedication[];
}) {
    const supabase = createClient();
    const [medications, setMedications] = useState(initialMedications);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [dosage, setDosage] = useState("");
    const [times, setTimes] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            const timesOfDay = times
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);

            const created = await addMedication(supabase, elderId, {
                name: name.trim(),
                dosage: dosage.trim() || undefined,
                times_of_day: timesOfDay,
                notes: notes.trim() || undefined,
            });

            if (created) {
                setMedications([...medications, created]);
                setName("");
                setDosage("");
                setTimes("");
                setNotes("");
                setShowForm(false);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (medicationId: string) => {
        await deleteMedication(supabase, medicationId);
        setMedications(medications.filter((m) => m.medication_id !== medicationId));
    };

    return (
        <div className="font-[family-name:var(--font-sans)]">
            {medications.length === 0 && !showForm && (
                <p className="text-sm text-[#22281F]/50">
                    Nothing on file yet.
                </p>
            )}

            <div className="divide-y divide-[#22281F]/10">
                {medications.map((med) => (
                    <div
                        key={med.medication_id}
                        className="flex items-start justify-between gap-4 py-4"
                    >
                        <div>
                            <p className="text-sm font-medium text-[#22281F]">
                                {med.name}
                                {med.dosage && (
                                    <span className="font-normal text-[#22281F]/50">
                                        {" "}
                                        — {med.dosage}
                                    </span>
                                )}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {med.times_of_day.map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-full bg-[#DCE3D6] px-2.5 py-0.5 text-xs font-medium text-[#4B6355]"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>

                            {med.notes && (
                                <p className="mt-1.5 text-xs text-[#22281F]/50">
                                    {med.notes}
                                </p>
                            )}
                        </div>

                        <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 text-[#22281F]/30 hover:bg-[#A8552F]/10 hover:text-[#A8552F]"
                            onClick={() => handleDelete(med.medication_id)}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-[#EFEAE0]/60 p-5">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="med-name" className="text-[#22281F]/70">
                            Name
                        </Label>
                        <Input
                            id="med-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Aspirin"
                            className="rounded-lg border-[#22281F]/15 bg-white focus-visible:ring-[#4B6355]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="med-dosage" className="text-[#22281F]/70">
                            Dosage
                        </Label>
                        <Input
                            id="med-dosage"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                            placeholder="e.g. 100mg"
                            className="rounded-lg border-[#22281F]/15 bg-white focus-visible:ring-[#4B6355]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="med-times" className="text-[#22281F]/70">
                            Times (comma separated)
                        </Label>
                        <Input
                            id="med-times"
                            value={times}
                            onChange={(e) => setTimes(e.target.value)}
                            placeholder="e.g. 08:00, 20:00"
                            className="rounded-lg border-[#22281F]/15 bg-white focus-visible:ring-[#4B6355]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="med-notes" className="text-[#22281F]/70">
                            Notes (optional)
                        </Label>
                        <Input
                            id="med-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="rounded-lg border-[#22281F]/15 bg-white focus-visible:ring-[#4B6355]"
                        />
                    </div>

                    <Button
                        onClick={handleAdd}
                        disabled={submitting}
                        className="rounded-full bg-[#4B6355] text-[#F7F4EC] hover:bg-[#3B4F44]"
                    >
                        {submitting ? "Saving..." : "Save medication"}
                    </Button>
                </div>
            )}

            <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(!showForm)}
                className="mt-4 gap-1.5 rounded-full text-[#4B6355] hover:bg-[#DCE3D6]/60 hover:text-[#3B4F44]"
            >
                <Plus size={14} />
                {showForm ? "Cancel" : "Add medication"}
            </Button>
        </div>
    );
}