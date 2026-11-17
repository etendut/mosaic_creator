import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Box, ButtonBase, IconButton, Snackbar } from '@mui/material';
import { tokens } from '../theme';

/** A message after an action: what happened, and optionally one thing to do about it. */
export interface ToastMessage {
    text: string;
    /** Something went wrong: shown in danger, with an icon, until it's closed. */
    error?: boolean;
    /** One text action at the end, like Undo. */
    action?: { label: string; onClick: () => void };
}

/** How long a message that isn't an error stays. */
export const TOAST_MS = 4000;

/**
 * A short message at the bottom centre, above a phone's tools: one look for every message, an inverse of the page
 * so it reads over any mosaic (docs/design-system/components/Toast).
 */
const Toast = ({ message, onClose }: { message: ToastMessage | null; onClose: () => void }) => (
    <Snackbar
        open={!!message}
        autoHideDuration={message?.error ? null : TOAST_MS}
        // it times out; the click that caused it mustn't close it straight away
        onClose={(_, reason) => reason !== 'clickaway' && onClose()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 'calc(var(--bottom-reserve, 16px) + 8px) !important' }}
    >
        {message ? (
            <Box
                role={message.error ? 'alert' : 'status'}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    maxWidth: 480,
                    minHeight: 48,
                    boxSizing: 'border-box',
                    paddingBlock: 1,
                    paddingInline: 2,
                    borderRadius: 1,
                    fontSize: 14,
                    lineHeight: 1.45,
                    backgroundColor: message.error ? tokens.danger : tokens.ink,
                    color: message.error ? tokens.onDanger : tokens.tray,
                    boxShadow: 2,
                }}
            >
                {message.error && <ErrorOutlineIcon sx={{ flexShrink: 0 }} />}
                <Box sx={{ flex: 1 }}>{message.text}</Box>
                {message.action && (
                    <ButtonBase
                        onClick={() => {
                            message.action!.onClick();
                            onClose();
                        }}
                        sx={{
                            minHeight: 40,
                            marginBlock: -1,
                            paddingInline: 1,
                            marginRight: -1,
                            borderRadius: 1,
                            fontSize: 14,
                            fontWeight: 500,
                            color: message.error ? tokens.onDanger : tokens.toastAction,
                        }}
                    >
                        {message.action.label}
                    </ButtonBase>
                )}
                {message.error && (
                    <IconButton aria-label="Close" onClick={onClose} sx={{ color: 'inherit', marginRight: -1 }}>
                        <CloseIcon />
                    </IconButton>
                )}
            </Box>
        ) : undefined}
    </Snackbar>
);

export default Toast;
