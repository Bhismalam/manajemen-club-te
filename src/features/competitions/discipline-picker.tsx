"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { SportType } from "@/generated/prisma/enums";
import type { DisciplineOption } from "@/services/time-trial-service";

const SPORT_LABEL: Record<SportType, string> = { SWIMMING: "Renang", FINSWIMMING: "Finswimming" };

// Checkbox nomor lomba, dikelompokkan per olahraga. Nomor yang sudah punya pendaftar
// (`lockedIds`) tidak bisa dilepas.
export function DisciplinePicker({
  options,
  value,
  onChange,
  lockedIds = [],
  invalid = false,
}: {
  options: DisciplineOption[];
  value: string[];
  onChange: (value: string[]) => void;
  lockedIds?: string[];
  invalid?: boolean;
}) {
  const selected = new Set(value);
  const locked = new Set(lockedIds);
  const sports = [...new Set(options.map((option) => option.sportType))];

  const toggle = (id: string, checked: boolean) => {
    if (!checked && locked.has(id)) return;
    onChange(checked ? [...value, id] : value.filter((v) => v !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      {sports.map((sport) => {
        const group = options.filter((option) => option.sportType === sport);
        const allSelected = group.every((option) => selected.has(option.id));
        return (
          <div
            key={sport}
            role="group"
            aria-labelledby={`sport-${sport}`}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id={`sport-${sport}`} className="text-sm font-semibold">
                {SPORT_LABEL[sport]}{" "}
                <span className="font-normal text-muted-foreground">
                  ({group.filter((option) => selected.has(option.id)).length}/{group.length})
                </span>
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const ids = new Set(group.map((option) => option.id));
                  onChange(
                    allSelected
                      ? value.filter((id) => !ids.has(id) || locked.has(id))
                      : [...value, ...group.map((o) => o.id).filter((id) => !selected.has(id))],
                  );
                }}
              >
                {allSelected ? "Kosongkan" : "Pilih semua"}
              </Button>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {group.map((option) => {
                const id = `discipline-${option.id}`;
                const isLocked = locked.has(option.id);
                return (
                  <label
                    key={option.id}
                    htmlFor={id}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
                  >
                    <Checkbox
                      id={id}
                      checked={selected.has(option.id)}
                      aria-invalid={invalid}
                      disabled={isLocked && selected.has(option.id)}
                      onCheckedChange={(checked) => toggle(option.id, checked === true)}
                    />
                    <span className="flex-1">
                      {option.name}
                      <span className="text-muted-foreground"> · {option.poolLength}m</span>
                    </span>
                    {isLocked && (
                      <span
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                        title="Sudah ada pendaftar di nomor ini"
                      >
                        <Lock className="size-3" aria-hidden="true" />
                        ada pendaftar
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
