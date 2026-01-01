const { DateTime } = require('luxon');

class TimezoneUtility {
    /**
     * Calculates the next available execution window based on organization business hours and timezone.
     * Prevents sending messages at 3 AM local time.
     */
    static getNextAvailableTime(targetTimezone = 'UTC', businessHours = { start: 9, end: 18 }) {
        let now = DateTime.now().setZone(targetTimezone);

        // If before business hours, move to today's start
        if (now.hour < businessHours.start) {
            return now.set({ hour: businessHours.start, minute: 0, second: 0 }).toJSDate();
        }

        // If after business hours or weekend, move to next business day
        if (now.hour >= businessHours.end || now.weekday >= 6) {
            let nextDay = now.plus({ days: now.weekday === 5 ? 3 : (now.weekday === 6 ? 2 : 1) });
            return nextDay.set({ hour: businessHours.start, minute: 0, second: 0 }).toJSDate();
        }

        return now.toJSDate(); // Already in business hours
    }

    static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    }
}

module.exports = TimezoneUtility;
