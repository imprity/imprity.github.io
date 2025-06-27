package main

import (
	"strings"
	"unicode"
)

func ConsumeSpace(str string, advance int) (string, int) {
	trimmed := strings.TrimLeftFunc(str, unicode.IsSpace)
	return trimmed, advance + len(str) - len(trimmed)
}

func ConsumeLiteral(str string, advance int, literal string) (string, int, bool) {
	if !strings.HasPrefix(str, literal) {
		return str, advance, false
	}
	return str[len(literal):], advance + len(literal), true
}
