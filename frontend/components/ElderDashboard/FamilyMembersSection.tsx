"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { IFamilyMember, addFamilyMember, deleteFamilyMember } from "@/db/family_members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users } from "lucide-react";

export default function FamilyMembersSection({
    elderId,
    initialFamilyMembers,
}: {
    elderId: string;
    initialFamilyMembers: IFamilyMember[];
}) {
    const supabase = createClient();
    const [familyMembers, setFamilyMembers] = useState(initialFamilyMembers);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [relation, setRelation] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            const created = await addFamilyMember(supabase, elderId, {
                name: name.trim(),
                relation: relation.trim() || undefined,
                notes: notes.trim() || undefined,
            });

            if (created) {
                setFamilyMembers([...familyMembers, created]);
                setName("");
                setRelation("");
                setNotes("");
                setShowForm(false);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (familyMemberId: string) => {
        await deleteFamilyMember(supabase, familyMemberId);
        setFamilyMembers(familyMembers.filter((f) => f.family_member_id !== familyMemberId));
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Users size={18} />
                    Family members
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                    <Plus size={14} className="mr-1" />
                    Add
                </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {familyMembers.length === 0 && !showForm && (
                    <p className="text-sm text-gray-500">No family members on file yet.</p>
                )}

                {familyMembers.map((member) => (
                    <div
                        key={member.family_member_id}
                        className="flex items-start justify-between border rounded-md p-3"
                    >
                        <div>
                            <p className="text-sm font-medium">
                                {member.name}
                                {member.relation && (
                                    <span className="text-gray-500 font-normal">
                                        {" "}
                                        — {member.relation}
                                    </span>
                                )}
                            </p>
                            {member.notes && (
                                <p className="text-xs text-gray-500 mt-1">{member.notes}</p>
                            )}
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(member.family_member_id)}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                ))}

                {showForm && (
                    <div className="flex flex-col gap-3 border rounded-md p-3">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="fam-name">Name</Label>
                            <Input
                                id="fam-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Ana"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="fam-relation">Relation</Label>
                            <Input
                                id="fam-relation"
                                value={relation}
                                onChange={(e) => setRelation(e.target.value)}
                                placeholder="e.g. daughter"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="fam-notes">Notes (optional)</Label>
                            <Input
                                id="fam-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. lives in Skopje, calls Sundays"
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={submitting}>
                            {submitting ? "Saving..." : "Save family member"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
