#!/usr/bin/env python3
"""
Script to replace handleStorefrontChat function with quality version
"""

# Read the main file
with open('index.ts', 'r') as f:
    lines = f.readlines()

# Read the quality version
with open('handleStorefrontChat-QUALITY.ts', 'r') as f:
    quality_lines = f.readlines()

# Remove the first 3 comment lines from quality version
quality_function = quality_lines[4:]  # Skip first 4 lines (comments + blank line)

# Find the function start and end
function_start = None
function_end = None

for i, line in enumerate(lines):
    if 'async function handleStorefrontChat' in line:
        function_start = i
    elif function_start is not None and i > function_start and line.strip().startswith('async function') or (line.strip().startswith('function') and not line.strip().startswith('//')):
        function_end = i
        break

if function_start is None:
    print("ERROR: Could not find handleStorefrontChat function")
    exit(1)

# Find the closing brace of the function by counting braces
brace_count = 0
for i in range(function_start, len(lines)):
    for char in lines[i]:
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and i > function_start:
                function_end = i + 1
                break
    if function_end:
        break

print(f"Function starts at line {function_start + 1}")
print(f"Function ends at line {function_end}")

# Replace the function
new_lines = lines[:function_start] + quality_function + lines[function_end:]

# Write back
with open('index.ts', 'w') as f:
    f.writelines(new_lines)

print(f"✅ Replaced function!")
print(f"   Old function: {function_end - function_start} lines")
print(f"   New function: {len(quality_function)} lines")
print(f"   Net change: {len(quality_function) - (function_end - function_start)} lines")
