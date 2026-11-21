import { ButtonBase, InputBase, Typography } from '@mui/material';
import { useState } from 'react';
import { RADIUS_CONTROL_PX, tokens } from '../app/theme';

/**
 * The open project's name in Mosaic's app bar, and where you rename it: click it and it turns into a text field;
 * Enter or leaving the field saves, Esc cancels (docs/design-system/README.md, Two views).
 */
const ProjectName = ({ name, onRename }: { name: string; onRename: (name: string) => void }) => {
    const [draft, setDraft] = useState<string | null>(null);
    const box = {
        minWidth: 0,
        maxWidth: { xs: 'none', md: 260 },
        flex: { xs: 1, md: '0 1 auto' },
        minHeight: 40,
        paddingInline: 1,
        borderRadius: `${RADIUS_CONTROL_PX}px`,
    };

    if (draft === null)
        return (
            <ButtonBase
                onClick={() => setDraft(name)}
                aria-label={`${name}, rename`}
                sx={{ ...box, justifyContent: 'flex-start', '&:hover': { backgroundColor: tokens.azureWash } }}
            >
                <Typography variant="subtitle1" noWrap component="span">
                    {name}
                </Typography>
            </ButtonBase>
        );

    const finish = (save: boolean) => {
        const next = draft.trim();
        if (save && next && next !== name) onRename(next);
        setDraft(null);
    };
    return (
        <InputBase
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => finish(true)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') finish(true);
                if (e.key === 'Escape') finish(false);
            }}
            inputProps={{ 'aria-label': 'Project name', maxLength: 80 }}
            sx={{
                ...box,
                width: { md: 260 },
                fontSize: 16,
                fontWeight: 500,
                border: `1px solid ${tokens.azure}`,
            }}
        />
    );
};

export default ProjectName;
