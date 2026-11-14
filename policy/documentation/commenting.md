# Commenting
<!-- {"name":"Commenting","code":"P-D-C","id":137} -->

This page sets the conventions for imports in Kotlin source files.

## Region markers and comment format
<!-- {"name":"Region markers and comment format","code":"P-D-C-RM","id":1103} -->

- Use Kotlin collapsible region/endregion markers for each top-level group
- Use the following format: `// 1. Organization Internal`, `// 1.1 Spartan Laboratories`

## The groups
<!-- {"name":"The groups","code":"P-D-C-GR","id":1104} -->

- Use comments to organize imports into the following groups:
  - **1.** "Organization Internal" (evaluate subgroups from most specific to least specific; 1.1 is
    the residual bucket)
    - **1.1** Spartan Laboratories (anything that starts with `com.spartanlabs` unless it falls into
      another 1.X category)
    - **1.2** Spartan Gaming (anything that starts with `com.spartanlabs.gaming`)
  - **2.** "Intended Function" (imports that directly support the core algorithm of the class/file
    and any owned vals/vars)
    - **2.1** (if a subfunction(s) exists) specific subfunctions
  - **3.** Utility / Catch-all
    - **3.1** Java Standard library
    - **3.2** Kotlin
      - **3.2.1** Standard library
      - **3.2.2** Kotlinx extensions
    - **3.3** Third party
      - **3.3.1** Specific organization
  - **4.** Programming Infrastructure and Support
    - **4.1** Logging
    - **4.2** Error Handling
    - **4.3** Testing (for test classes (in `src/test`))
    - **4.4** Profiling (if present)
- If a group/subgroup is not present a comment line is not required.

## Order and unused imports
<!-- {"name":"Order and unused imports","code":"P-D-C-OU","id":1105} -->

- Within a final specified group/subgroup, group alphabetically by fully qualified import path
- For imports where multiple groups are appropriate use the following top-level group priority:
  1,4,(2/3)
- Create a group or subgroup even if only one member of that group exists
- Always Clean up unused imports
