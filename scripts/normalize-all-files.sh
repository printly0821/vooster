#!/bin/bash

# 전체 프로젝트 Line Ending 정규화 스크립트

set -e

echo "전체 프로젝트 파일을 CRLF → LF로 변환합니다..."
echo ""

COUNT=0

# TypeScript 파일
echo "TypeScript 파일 변환 중..."
for file in $(git ls-files | grep -E '\.(ts|tsx)$'); do
  if [ -f "$file" ]; then
    tr -d '\r' < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    ((COUNT++))
  fi
done

# JavaScript 파일
echo "JavaScript 파일 변환 중..."
for file in $(git ls-files | grep -E '\.(js|jsx|mjs|cjs)$'); do
  if [ -f "$file" ]; then
    tr -d '\r' < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    ((COUNT++))
  fi
done

# JSON 파일
echo "JSON 파일 변환 중..."
for file in $(git ls-files | grep -E '\.json$'); do
  if [ -f "$file" ]; then
    tr -d '\r' < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    ((COUNT++))
  fi
done

# CSS 파일
echo "CSS 파일 변환 중..."
for file in $(git ls-files | grep -E '\.(css|scss|sass)$'); do
  if [ -f "$file" ]; then
    tr -d '\r' < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    ((COUNT++))
  fi
done

# Markdown 파일
echo "Markdown 파일 변환 중..."
for file in $(git ls-files | grep -E '\.md$'); do
  if [ -f "$file" ]; then
    tr -d '\r' < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    ((COUNT++))
  fi
done

# YAML 파일
echo "YAML 파일 변환 중..."
for file in $(git ls-files | grep -E '\.(yml|yaml)$'); do
  if [ -f "$file" ]; then
    tr -d '\r' < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    ((COUNT++))
  fi
done

# Shell 스크립트
echo "Shell 스크립트 변환 중..."
for file in $(git ls-files | grep -E '\.sh$'); do
  if [ -f "$file" ]; then
    tr -d '\r' < "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
    ((COUNT++))
  fi
done

echo ""
echo "✓ 총 $COUNT 개의 파일을 변환했습니다"
echo ""
