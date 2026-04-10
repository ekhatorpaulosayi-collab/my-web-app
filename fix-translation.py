#!/usr/bin/env python3
"""
Fix translation in ai-chat function to always translate, not just when agent is active
"""

import re

# Read the file
with open('/home/ekhator1/smartstock-v2/supabase/functions/ai-chat/index.ts', 'r') as f:
    content = f.read()

# Find and replace the conditional translation with always-on translation
# Look for the pattern where we check for agent active state before translating
pattern = r"(// Translate message if human agent is active.*?)(if \(convState\?\.is_agent_active\) \{[^}]*console\.log\('\[Translation\] Human active - detecting language and translating'\);)"

# Check if pattern exists
if re.search(pattern, content, re.DOTALL):
    print("Found conditional translation pattern")

    # Replace the check for is_agent_active with always translating
    # We want to remove the if condition but keep the translation logic
    content = re.sub(
        r"// Check if agent is active\s+const \{ data: convState \}.*?\.single\(\);\s+if \(convState\?\.is_agent_active\) \{\s+console\.log\('\[Translation\] Human active - detecting language and translating'\);",
        "// Always translate for owner visibility (not just when agent is active)\n        console.log('[Translation] Detecting language and translating customer message');",
        content,
        flags=re.DOTALL
    )

    # Also need to remove the closing brace for the if statement
    # Find and remove the corresponding closing brace after the translation try-catch block
    # Look for the pattern: } catch (e) { ... } } (double closing brace)
    content = re.sub(
        r"(\} catch \(e\) \{[^}]*console\.error\('\[Translation\] Error:', e\);[^}]*// Continue without translation if it fails[^}]*\})\s*\}",
        r"\1",
        content,
        count=1,
        flags=re.DOTALL
    )

    print("Successfully updated translation to always run")
else:
    print("Pattern not found, trying alternative approach...")

    # Alternative: look for the specific line numbers (around 2436)
    lines = content.split('\n')

    # Find the line with "if (convState?.is_agent_active) {"
    for i, line in enumerate(lines):
        if "if (convState?.is_agent_active) {" in line:
            print(f"Found conditional at line {i+1}")
            # Comment out the if statement
            lines[i] = "        // Always translate (removed agent check)"

            # Find and update the console.log line
            for j in range(i+1, min(i+5, len(lines))):
                if "[Translation] Human active" in lines[j]:
                    lines[j] = "        console.log('[Translation] Detecting language and translating customer message');"
                    break

            # Find the corresponding closing brace
            # Count braces to find the matching one
            brace_count = 1
            for j in range(i+1, len(lines)):
                if '{' in lines[j]:
                    brace_count += lines[j].count('{')
                if '}' in lines[j]:
                    brace_count -= lines[j].count('}')
                    if brace_count == 0:
                        # Found the matching closing brace
                        # Check if it's just a closing brace on its own
                        if lines[j].strip() == '}':
                            lines[j] = '        // Removed closing brace for agent check'
                        break

            content = '\n'.join(lines)
            print("Successfully updated translation using line-by-line approach")
            break

# Write back the modified content
with open('/home/ekhator1/smartstock-v2/supabase/functions/ai-chat/index.ts', 'w') as f:
    f.write(content)

print("File updated successfully!")