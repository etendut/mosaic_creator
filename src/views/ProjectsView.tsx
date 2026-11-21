import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SortIcon from '@mui/icons-material/Sort';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sizes, tokens } from '../app/theme';
import ProjectCard, { LoadingCard } from '../components/ProjectCard';
import { formatBytes, formatDay } from '../library/format';
import type { ProjectEntry } from '../library/types';
import { claimPrompt } from '../library/prompts';
import { canUseFolders, type Library, type LibraryPrompt } from '../library/useLibrary';
import { installed, isAppleMobile } from '../lib/pwa';
import AppBarAction from '../ui/AppBarAction';
import ChoiceRow from '../ui/ChoiceRow';
import HelpText from '../ui/HelpText';
import StepLayout, { type ToolGroup } from '../ui/StepLayout';
import Toast, { type ToastMessage } from '../ui/Toast';
import { Stage, Tray } from '../ui/Tray';

type Sort = 'recent' | 'name';

/** "1 mosaic", "7 mosaics". */
const mosaics = (n: number) => `${n} ${n === 1 ? 'mosaic' : 'mosaics'}`;

/** Where projects are kept, said for the Storage help line: what the browser granted decides what it says. */
const storageHelp = (library: Library) => {
    if (library.kind === 'folder')
        return "You'll find each mosaic here as a .mosaic.zip file. Put the folder inside Google Drive or OneDrive to sync it.";
    if (isAppleMobile() && !installed())
        return 'Safari clears these after 7 days unused. Add the app to your Home Screen to keep them.';
    return library.persisted
        ? 'Your browser keeps these until you clear its site data. Back up all saves a copy.'
        : 'Your browser can clear these when it runs short of space. Back up all saves a copy.';
};

/** A card-sized EmptyState in the canvas: what's wrong or what to do, and the one button for it. */
const EmptyCard = ({
    heading,
    lead,
    action,
    onAction,
    tip,
}: {
    heading: string;
    lead: string;
    action: string;
    onAction: () => void;
    tip?: string;
}) => (
    <Stack sx={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 1 }}>
        <Tray sx={{ padding: 4, textAlign: 'center', maxWidth: sizes.emptyCard }}>
            <Typography variant="h2" component="p" gutterBottom>
                {heading}
            </Typography>
            <Typography color="textSecondary" sx={{ paddingBottom: 2.5 }}>
                {lead}
            </Typography>
            <Button variant="contained" size="large" onClick={onAction}>
                {action}
            </Button>
            {tip && (
                <Typography variant="body2" color="textSecondary" sx={{ paddingTop: 2.5 }}>
                    {tip}
                </Typography>
            )}
        </Tray>
    </Stack>
);

interface ProjectsViewProps {
    library: Library;
    /** The project open in the editor, shown first and marked current. */
    openId: string | null;
    /** Projects whose file wouldn't open this visit. */
    broken: ReadonlySet<string>;
    onOpen: (entry: ProjectEntry) => void;
    onOpenPrevious: (entry: ProjectEntry) => void;
    onNew: () => void;
    /** Open file…: pick a project, template or backup (the same picker as ☰ → Open file… on a phone). */
    onOpenFile: () => void;
    /** A project was deleted (the app closes it if it was open). */
    onDeleted: (id: string) => void;
    /** Projects are now kept somewhere else: the open one isn't among them. */
    onStorageChanged: () => void;
}

/** The Mosaics view: every project, as a collection page (docs/design-system/README.md, Collection pages). */
const ProjectsView = ({
    library,
    openId,
    broken,
    onOpen,
    onOpenPrevious,
    onNew,
    onOpenFile,
    onDeleted,
    onStorageChanged,
}: ProjectsViewProps) => {
    const { projects, status, kind } = library;
    const [sort, setSort] = useState<Sort>('recent');
    const [message, setMessage] = useState<ToastMessage | null>(null);
    // after choosing a folder: how many mosaics the browser has to copy across
    const [offerCopy, setOfferCopy] = useState<{ count: number; folder: string } | null>(null);
    // the prompt on screen, and whether you acted on it (closing it otherwise means no)
    const showing = useRef<Exclude<LibraryPrompt, null> | null>(null);
    const acted = useRef(false);

    const fail = (e: unknown) => setMessage({ error: true, text: e instanceof Error ? e.message : String(e) });

    // the open project first, then the rest in the chosen order
    const shown = useMemo(() => {
        const order = [...projects].sort((a, b) =>
            sort === 'name' ? a.name.localeCompare(b.name) : b.savedAt.getTime() - a.savedAt.getTime(),
        );
        const current = order.findIndex((p) => p.id === openId);
        return current > 0 ? [order[current], ...order.slice(0, current), ...order.slice(current + 1)] : order;
    }, [projects, sort, openId]);

    const backUp = async () => {
        try {
            const count = await library.backUpAll();
            setMessage({ text: `Backed up ${mosaics(count)} in one zip. Open it with Open file… to restore them.` });
        } catch (e) {
            fail(e);
        }
    };

    /** Pick a folder; moving from the browser, offer to copy in what it holds (not when changing folders). */
    const chooseFolder = async () => {
        const browserHas = kind === 'browser' ? await library.browserCount() : 0;
        const folder = await library.chooseFolder();
        if (!folder) return;
        onStorageChanged();
        if (browserHas > 0) setOfferCopy({ count: browserHas, folder });
    };

    // on opening Mosaics: the one prompt due, once a visit
    const { prompt } = library;
    useEffect(() => {
        if (!prompt || !claimPrompt()) return;
        showing.current = prompt;
        acted.current = false;
        setMessage(
            prompt === 'backup'
                ? {
                      text: `${mosaics(library.changedSinceBackup)} changed since your last backup.`,
                      action: {
                          label: 'Back up',
                          onClick: () => {
                              acted.current = true;
                              void backUp();
                          },
                      },
                      stays: true,
                  }
                : {
                      text: 'Keep your mosaics as files you can see and sync.',
                      action: {
                          label: 'Choose folder…',
                          onClick: () => {
                              // acting on it answers it too: it doesn't come back
                              void library.closePrompt('folder');
                              acted.current = true;
                              void chooseFolder();
                          },
                      },
                      stays: true,
                  },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when a prompt is first due
    }, [prompt]);

    const closeMessage = () => {
        if (showing.current && !acted.current) void library.closePrompt(showing.current);
        showing.current = null;
        setMessage(null);
    };

    const remove = async (entry: ProjectEntry) => {
        try {
            const undo = await library.remove(entry.id);
            onDeleted(entry.id);
            setMessage({ text: `Deleted ${entry.name}.`, action: { label: 'Undo', onClick: () => void undo() } });
        } catch (e) {
            fail(e);
        }
    };

    const duplicate = async (entry: ProjectEntry) => {
        try {
            await library.duplicate(entry.id);
        } catch (e) {
            fail(e);
        }
    };

    const groups: ToolGroup[] = [
        {
            id: 'storage',
            label: 'Storage',
            icon: <FolderOutlinedIcon />,
            content: (
                <>
                    {/* a linked folder is where your mosaics are, not one of two options: it shows as a fact */}
                    {kind === 'folder' && (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <FolderOutlinedIcon sx={{ color: tokens.muted }} />
                            <Typography sx={{ fontWeight: 500, minWidth: 0 }} noWrap>
                                {library.folderName || 'Your folder'}
                            </Typography>
                        </Stack>
                    )}
                    <HelpText>{storageHelp(library)}</HelpText>
                    <Stack direction="row" spacing={1}>
                        {kind === 'folder' ? (
                            <Button size="small" onClick={() => void chooseFolder().catch(fail)}>
                                Change folder…
                            </Button>
                        ) : (
                            <>
                                <Button size="small" onClick={() => void backUp()} disabled={projects.length === 0}>
                                    Back up all
                                </Button>
                                {canUseFolders() && (
                                    <Button size="small" onClick={() => void chooseFolder().catch(fail)}>
                                        Use a folder…
                                    </Button>
                                )}
                            </>
                        )}
                    </Stack>
                </>
            ),
        },
        {
            id: 'sort',
            label: 'Sort',
            icon: <SortIcon />,
            content: (
                <ChoiceRow
                    label="Order"
                    value={sort}
                    onChange={(v) => setSort(v as Sort)}
                    options={[
                        ['recent', 'Recent'],
                        ['name', 'Name'],
                    ]}
                />
            ),
        },
    ];

    const space = projects.reduce((sum, p) => sum + p.size, 0);
    const info: [string, string][] =
        status === 'ready'
            ? [
                  ['Mosaics', projects.length.toLocaleString()],
                  ['Space', formatBytes(space)],
                  ...(kind === 'browser'
                      ? [
                            ['Backed up', library.lastBackup ? formatDay(library.lastBackup) : 'Never'] as [
                                string,
                                string,
                            ],
                        ]
                      : []),
              ]
            : [];

    const canvas = () => {
        if (status === 'blocked')
            return (
                <EmptyCard
                    heading={`Open ${library.folderName ?? 'your folder'} again`}
                    lead="Your browser needs your OK to read the folder."
                    action="Allow access"
                    onAction={() => void library.allowAccess()}
                />
            );
        if (status === 'ready' && shown.length === 0)
            return (
                <EmptyCard
                    heading="No mosaics yet"
                    lead="Start with a picture. You'll find your mosaic here, saved as you go."
                    action="New mosaic"
                    onAction={onNew}
                    tip="Have a .mosaic.zip? Open it with Open file…"
                />
            );
        return (
            <Box
                component="ul"
                aria-label="Mosaics"
                aria-busy={status === 'loading'}
                sx={{
                    margin: 0,
                    padding: 0,
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: `repeat(auto-fill, minmax(${sizes.projectCard}px, 1fr))`,
                    },
                    alignContent: 'start',
                }}
            >
                {status === 'loading'
                    ? [0, 1, 2].map((i) => <LoadingCard key={i} />)
                    : shown.map((entry) => (
                          <ProjectCard
                              key={entry.id}
                              entry={entry}
                              current={entry.id === openId}
                              broken={broken.has(entry.id)}
                              onOpen={() => onOpen(entry)}
                              onOpenPrevious={() => onOpenPrevious(entry)}
                              onDuplicate={() => void duplicate(entry)}
                              onDelete={() => void remove(entry)}
                          />
                      ))}
            </Box>
        );
    };

    return (
        <>
            <AppBarAction>
                <Button variant="outlined" onClick={onOpenFile} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                    Open file…
                </Button>
                <Button variant="contained" onClick={onNew}>
                    New mosaic
                </Button>
            </AppBarAction>
            <StepLayout groups={groups} info={info}>
                <Stage sx={{ display: 'flex', flexDirection: 'column' }}>{canvas()}</Stage>
            </StepLayout>
            <Dialog open={!!offerCopy} onClose={() => setOfferCopy(null)}>
                <DialogTitle>Copy your mosaics into {offerCopy?.folder}?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Your browser keeps {mosaics(offerCopy?.count ?? 0)}. Copy them into {offerCopy?.folder} to keep
                        them all in one place. The browser keeps its copies too.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOfferCopy(null)}>Not now</Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            setOfferCopy(null);
                            try {
                                const count = await library.copyBrowserIntoFolder();
                                setMessage({ text: `Copied ${mosaics(count)} into ${library.folderName}.` });
                            } catch (e) {
                                fail(e);
                            }
                        }}
                    >
                        Copy {mosaics(offerCopy?.count ?? 0)}
                    </Button>
                </DialogActions>
            </Dialog>
            <Toast message={message} onClose={closeMessage} />
        </>
    );
};

export default ProjectsView;
