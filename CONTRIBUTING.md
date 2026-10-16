# Guidelines

## Directory Naming & Nomenclature

- Files, Folders & Packages: `kebab-case` (e.g., `shopping-cart.py`).
- Namespaces, Classes, Enums, Structs, Interfaces: `PascalCase` (e.g., `ShoppingCart`).
- Functions & Methods: `camelCase` (e.g., `addItem`, `totalAmount`).
- Normal Variables, Parameters and Arguments: `lower_snake_case` (e.g. `user_id`)
- Constants, Final and Global Variables: `UPPER_SNAKE_CASE` (e.g., `MAX_ITEMS`).

## Coding Structure & Formatting

- File Header: Every file must start with a header comment including the File Name and Purpose.
- Top-Level Imports: Imports must be placed at the very top of the file, immediately following the header comment.
- Top-Level Declarations: All Global, Final, Constant, and Static variables must be declared at the top of the file, immediately after the imports.
- Class/Enum Comments: Every Namespace, Class, Struct, Enum, Union, and Interface must have a short multiline comment explaining its purpose.
- Function/Method Comments: Every function/method must have a short multiline comment explaining its purpose, parameters (Takes), and return value (Gives) using this exact format:

    ```text
    [Clear, concise description of the method/function's purpose]

    Takes:
        [parameter_name] ([type]): [Description of what it takes].

    Gives:
        [type]: [Description of what it returns].
    ```

- CRITICAL: Do not use single-line comments (# ...) under any circumstances. All comments must be block/multiline comments or docstrings.
- Structural Brackets: Brackets for Namespaces, Classes, Structs, Enums, Methods, and Functions must start on the next line.
- Conditional Brackets: Brackets for Conditional Statements must start on the same line.

## Branching & Commits

- Branch Naming: Use `<subprojectname or projectname>/feature/<Name>`, `<subprojectname or projectname>/defectfix/<Name>`, `<subprojectname or projectname>/documentation/<Name>`, `<subprojectname or projectname>/improvement/<Name>`, or `<subprojectname or projectname>/infrastructure/<Name>` prefixes for your branch names.
- Conventional Commits: All repository commits must strictly adhere to the Conventional Commits specification.
- Scopes: Scopes are explicitly forbidden to keep histories clean and highly readable (never use scopes or parentheses `()`).
- Atomic Commits: Keep your commits small and focused on a single change.

## Issues & Pull Requests

- Issue Templates: You must use the provided issue templates for all bugs or features.
- PR Templates: Fill out the Pull Request template completely when submitting code.
- Incomplete Submissions: Please don't submit blank issues or PRs. If you decide not to use the provided default template, make sure your text still includes all the core details the template asks for. Empty or uninformative submissions will be automatically closed.
- Link Issues: Always link your PR to an existing, approved issue.
- Review Process: Wait for at least one maintainer approval before merging.
- Be Responsive: Address review feedback or questions within a few days.

## Reviewing

- Use Conventional Comments: Structure all review feedback using conventional comments in the format `<label> [decorations]: <subject>` (utilizing labels like `todo`, `nitpick`, `suggestion`, and `thought`).
- Actionability: Keep comments actionable by clearly stating what needs to change and providing a quick reasoning why.
- GitHub Suggestion Blocks: When leaving a review comment on GitHub, click the Insert a suggestion button in the markdown toolbar to embed your suggested code directly into the comment for instant single-click application.
