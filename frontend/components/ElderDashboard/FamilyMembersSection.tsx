"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { IFamilyMember, addFamilyMember, deleteFamilyMember } from "@/db/family_members";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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
        <div className="font-[family-name:var(--font-sans)]">
            {familyMembers.length === 0 && !showForm && (
                <p className="text-sm text-[#22281F]/50">
                    Сè уште нема внесено членови на семејството.
                </p>
            )}

            <div className="divide-y divide-[#22281F]/10">
                {familyMembers.map((member) => (
                    <div
                        key={member.family_member_id}
                        className="flex items-start justify-between gap-4 py-4"
                    >
                        <div>
                            <p className="text-sm font-medium text-[#22281F]">
                                {member.name}
                                {member.relation && (
                                    <span className="font-normal text-[#22281F]/50">
                                        {" "}
                                        — {member.relation}
                                    </span>
                                )}
                            </p>

                            {member.notes && (
                                <p className="mt-1.5 text-xs text-[#22281F]/50">
                                    {member.notes}
                                </p>
                            )}
                        </div>

                        <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 text-[#22281F]/30 hover:bg-[#A8552F]/10 hover:text-[#A8552F]"
                            onClick={() => handleDelete(member.family_member_id)}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-[#EFEAE0]/60 p-5">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fam-name" className="text-[#22281F]/70">
                            Име
                        </Label>
                        <Input
                            id="fam-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="на пр. Ана"
                            className="rounded-lg border-[#22281F]/15 bg-white focus-visible:ring-[#4B6355]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fam-relation" className="text-[#22281F]/70">
                            Роднинска врска
                        </Label>
                        <Input
                            id="fam-relation"
                            value={relation}
                            onChange={(e) => setRelation(e.target.value)}
                            placeholder="на пр. ќерка"
                            className="rounded-lg border-[#22281F]/15 bg-white focus-visible:ring-[#4B6355]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fam-notes" className="text-[#22281F]/70">
                            Белешки{" "}
                            <span className="font-normal text-[#22281F]/40">
                                (незадолжително)
                            </span>
                        </Label>
                        <Input
                            id="fam-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="на пр. живее во Скопје, се јавува во недела"
                            className="rounded-lg border-[#22281F]/15 bg-white focus-visible:ring-[#4B6355]"
                        />
                    </div>

                    <Button
                        onClick={handleAdd}
                        disabled={submitting}
                        className="rounded-full bg-[#4B6355] text-[#F7F4EC] hover:bg-[#3B4F44]"
                    >
                        {submitting ? "Се зачувува..." : "Зачувај член на семејството"}
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
                {showForm ? "Откажи" : "Додади член на семејството"}
            </Button>
        </div>
    );
}