package issue

import "time"

// EpochDay converts a calendar date to OneDev-style epoch day (days since 1970-01-01 UTC).
func EpochDay(t time.Time) int64 {
	y, m, d := t.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Unix() / 86400
}

// FromEpochDay converts epoch day back to UTC midnight.
func FromEpochDay(day int64) time.Time {
	return time.Unix(day*86400, 0).UTC()
}

// ParseISODate parses yyyy-MM-dd into epoch day.
func ParseISODate(s string) (int64, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return 0, err
	}
	return EpochDay(t), nil
}

// FormatEpochDay formats epoch day as yyyy-MM-dd.
func FormatEpochDay(day int64) string {
	return FromEpochDay(day).Format("2006-01-02")
}
