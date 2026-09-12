"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { IMedication, addMedication, deleteMedication } from "@/db/medications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pill } from "lucide-react";

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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Pill size={18} />
                    Medications
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                    <Plus size={14} className="mr-1" />
                    Add
                </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {medications.length === 0 && !showForm && (
                    <p className="text-sm text-gray-500">No medications on file yet.</p>
                )}

                {medications.map((med) => (
                    <div
                        key={med.medication_id}
                        className="flex items-start justify-between border rounded-md p-3"
                    >
                        <div>
                            <p className="text-sm font-medium">
                                {med.name}
                                {med.dosage && (
                                    <span className="text-gray-500 font-normal"> — {med.dosage}</span>
                                )}
                            </p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                                {med.times_of_day.map((t) => (
                                    <Badge key={t} variant="secondary">
                                        {t}
                                    </Badge>
                                ))}
                            </div>
                            {med.notes && (
                                <p className="text-xs text-gray-500 mt-1">{med.notes}</p>
                            )}
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(med.medication_id)}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                ))}

                {showForm && (
                    <div className="flex flex-col gap-3 border rounded-md p-3">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="med-name">Name</Label>
                            <Input
                                id="med-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Aspirin"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="med-dosage">Dosage</Label>
                            <Input
                                id="med-dosage"
                                value={dosage}
                                onChange={(e) => setDosage(e.target.value)}
                                placeholder="e.g. 100mg"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="med-times">Times (comma separated)</Label>
                            <Input
                                id="med-times"
                                value={times}
                                onChange={(e) => setTimes(e.target.value)}
                                placeholder="e.g. 08:00, 20:00"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="med-notes">Notes (optional)</Label>
                            <Input
                                id="med-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={submitting}>
                            {submitting ? "Saving..." : "Save medication"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
