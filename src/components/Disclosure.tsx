import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, Collapse } from '@mui/material';
import { useId, useState, type ReactNode } from 'react';

interface DisclosureProps {
    /** The button's text, e.g. "More colour options". */
    label: string;
    /** A short note after the label while closed, e.g. "2 changed", so settings inside aren't silently in effect. */
    note?: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

/** Settings most people don't need, behind a button that shows and hides them. */
const Disclosure = ({ label, note, defaultOpen = false, children }: DisclosureProps) => {
    const [open, setOpen] = useState(defaultOpen);
    const id = useId();
    return (
        <Box>
            <Button
                size="small"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={id}
                endIcon={
                    <ExpandMoreIcon
                        sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                    />
                }
                sx={{ marginLeft: -1 }}
            >
                {label}
                {note && !open && (
                    <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400, marginLeft: 1 }}>
                        ({note})
                    </Box>
                )}
            </Button>
            <Collapse in={open} unmountOnExit>
                <Box id={id} sx={{ paddingTop: 1 }}>
                    {children}
                </Box>
            </Collapse>
        </Box>
    );
};

export default Disclosure;
