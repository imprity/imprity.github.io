package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
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

func FileExists(name string, isDir bool) (bool, error) {
	info, err := os.Stat(name)

	if err == nil { // file exists
		mode := info.Mode()
		if isDir && !mode.IsDir() {
			return false, nil
		}

		if !isDir && !mode.IsRegular() {
			return false, nil
		}

		return true, nil
	} else if errors.Is(err, os.ErrNotExist) { // file does not exists
		return false, nil
	} else { // unable to check if file exists or not
		return false, err
	}
}

// delete a file
// unlike os.Remove,
// it's not an error if file didn't exist in a first place
func DeleteFile(name string) error {
	name = filepath.Clean(name)

	exists, err := FileExists(name, false)
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}
	err = os.Remove(name)
	if err != nil {
		return err
	}
	return nil
}

func CopyFile(src, dst string) error {
	src = filepath.Clean(src)
	dst = filepath.Clean(dst)

	srcFile, err := os.Open(src)
	defer srcFile.Close()
	if err != nil {
		return err
	}

	info, err := srcFile.Stat()
	if err != nil {
		return err
	}

	if !info.Mode().IsRegular() {
		return fmt.Errorf("file is not a regular file")
	}

	perm := info.Mode().Perm()

	srcContent, err := io.ReadAll(srcFile)
	if err != nil {
		return err
	}

	err = os.WriteFile(dst, srcContent, perm)
	if err != nil {
		return err
	}

	return nil
}
