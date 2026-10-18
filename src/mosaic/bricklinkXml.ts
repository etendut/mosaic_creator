import type { PartLine } from './partsList';

const escapeXml = (value: string) =>
    value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** BrickLink wanted-list upload XML (https://www.bricklink.com/help.asp?helpID=207). */
export const toBrickLinkXml = (lines: PartLine[]) => {
    const items = lines
        .filter((line) => line.quantity > 0)
        .map(
            (line) =>
                '  <ITEM>\n' +
                '    <ITEMTYPE>P</ITEMTYPE>\n' +
                `    <ITEMID>${escapeXml(line.partId)}</ITEMID>\n` +
                `    <COLOR>${line.color.id}</COLOR>\n` +
                `    <MINQTY>${line.quantity}</MINQTY>\n` +
                '  </ITEM>\n',
        )
        .join('');
    return `<INVENTORY>\n${items}</INVENTORY>\n`;
};
