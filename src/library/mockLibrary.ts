import { useCallback, useState } from 'react';

/**
 * PROTOTYPE: a library held in memory, for working out the navigation between Projects and Mosaic. Nothing is
 * saved or loaded: every project opens the one mosaic the app has. The real library replaces this (see
 * .claude/plans/projects-library.md).
 */
export interface ProjectEntry {
    id: string;
    name: string;
    savedAt: Date;
    /** The mosaic's size in bricks, or null before it has a picture. */
    bricks: [number, number] | null;
    /** The file's size in bytes. */
    size: number;
    /** Which made-up picture its thumbnail shows. */
    seed: number;
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const MOCK: ProjectEntry[] = [
    { id: 'k3v9', name: 'Balloon', savedAt: daysAgo(0), bricks: [64, 64], size: 2_400_000, seed: 1 },
    { id: 'p7d2', name: 'Library Day banner', savedAt: daysAgo(1), bricks: [96, 32], size: 3_100_000, seed: 2 },
    { id: 'a1m8', name: 'Club logo', savedAt: daysAgo(4), bricks: [32, 32], size: 840_000, seed: 3 },
    {
        id: 'x5q4',
        name: 'Sunset over the harbour at Fremantle',
        savedAt: daysAgo(18),
        bricks: [48, 64],
        size: 4_700_000,
        seed: 4,
    },
    { id: 'r2t6', name: 'Grandad', savedAt: daysAgo(40), bricks: [48, 48], size: 1_900_000, seed: 5 },
    { id: 'h8w1', name: 'Fox', savedAt: daysAgo(400), bricks: [32, 48], size: 1_200_000, seed: 6 },
];

let made = 0;
const newId = () => `n${Date.now().toString(36)}${made++}`;

/** A free name: "Balloon (2)" when "Balloon" is taken. */
const freeName = (name: string, taken: string[]) => {
    const base = name.replace(/ \(\d+\)$/, '');
    for (let n = 2; ; n++) if (!taken.includes(`${base} (${n})`)) return `${base} (${n})`;
};

export const useMockLibrary = () => {
    const [projects, setProjects] = useState<ProjectEntry[]>(MOCK);
    const [currentId, setCurrentId] = useState<string | null>(MOCK[0].id);
    const current = projects.find((p) => p.id === currentId) ?? null;

    const rename = useCallback(
        (id: string, name: string) =>
            setProjects((list) => list.map((p) => (p.id === id ? { ...p, name, savedAt: new Date() } : p))),
        [],
    );

    /** A copy next to the original, not opened. */
    const duplicate = useCallback((id: string) => {
        setProjects((list) => {
            const i = list.findIndex((p) => p.id === id);
            if (i < 0) return list;
            const copy = {
                ...list[i],
                id: newId(),
                name: freeName(
                    list[i].name,
                    list.map((p) => p.name),
                ),
                savedAt: new Date(),
            };
            return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
        });
    }, []);

    /** Remove a project; the returned function puts it back. */
    const remove = useCallback(
        (id: string) => {
            const i = projects.findIndex((p) => p.id === id);
            const gone = projects[i];
            if (!gone) return () => {};
            setProjects((list) => list.filter((p) => p.id !== id));
            return () =>
                setProjects((list) =>
                    list.some((p) => p.id === id) ? list : [...list.slice(0, i), gone, ...list.slice(i)],
                );
        },
        [projects],
    );

    /** A new, empty project, made the open one. */
    const create = useCallback(() => {
        const entry: ProjectEntry = {
            id: newId(),
            name: 'New mosaic',
            savedAt: new Date(),
            bricks: null,
            size: 0,
            seed: 0,
        };
        setProjects((list) => [entry, ...list]);
        setCurrentId(entry.id);
        return entry;
    }, []);

    return { projects, current, currentId, setCurrentId, rename, duplicate, remove, create };
};

export type MockLibrary = ReturnType<typeof useMockLibrary>;
