/**
 * lib/line.ts
 * 
 * LINE Messaging API utility for outbound notifications.
 */

interface LineMessage {
    type: 'text';
    text: string;
}

export async function sendLineNotification(lineId: string, message: string) {
    // These should be fetched from the database (StoreSetting)
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    // For demo/development: Log the notification if tokens are missing
    if (!CHANNEL_ACCESS_TOKEN || !lineId) {
        console.log('\x1b[35m%s\x1b[0m', `[LINE Mock Notification] To: ${lineId || 'MANAGER'}, Message: ${message}`);
        return true; // Return true to simulate success in demo
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: lineId,
                messages: [{ type: 'text', text: message }]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[LINE] Error sending message:', data);
            return false;
        }

        console.log('[LINE] Message sent successfully to:', lineId);
        return true;
    } catch (error) {
        console.error('[LINE] Exception in sendLineNotification:', error);
        return false;
    }
}

/**
 * Message Templates
 */
export const LINE_TEMPLATES = {
    AVAILABILITY_SUBMITTED: (castName: string) => 
        `【シフト希望】${castName}さんがシフト希望を提出しました。`,
    SHIFT_PUBLISHED: (dateRange: string) => 
        `【シフト確定】${dateRange}のシフトが確定・公開されました。アプリから確認してください。`,
    SWAP_REQUESTED: (castName: string, date: string) => 
        `【交代申請】${castName}さんから${date}の交代申請が届きました。`,
    SWAP_APPLIED: (applicantName: string, date: string) => 
        `【ヘルプ立候補】${date}の交代枠に${applicantName}さんが立候補しました。承認をお願いします。`,
    SWAP_APPROVED: (date: string) => 
        `【交代完了】${date}のシフト交代が承認されました。最新のシフトを確認してください。`
};
