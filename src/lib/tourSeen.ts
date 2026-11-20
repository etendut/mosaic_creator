const KEY = 'mosaic-creator:walkthrough-seen';

/** Whether the Walkthrough has been finished or skipped once, so the Image step stops offering it. */
export const tourSeen = () => {
    try {
        return localStorage.getItem(KEY) === 'yes';
    } catch {
        return false;
    }
};

export const rememberTourSeen = () => {
    try {
        localStorage.setItem(KEY, 'yes');
    } catch {
        // not remembered; the offer just shows again next time
    }
};
