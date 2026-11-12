# Guidelines

## Directory Naming & Nomenclature

### Nomenclature (Rust)
- Files, Folders & Packages: `lower_snake_case` (e.g., `shopping_cart.rs`).
- Namespaces, Classes, Enums, Structs, Interfaces: `PascalCase` (e.g., `ShoppingCart`).
- Functions & Methods: `lower_snake_case` (e.g., `add_item`, `total_item`).
- Normal Variables, Parameters and Arguments: `lower_snake_case` (e.g., `user_id`).
- Constants, Final and Global Variables: `UPPER_SNAKE_CASE` (e.g., `MAX_ITEMS`).

### Nomenclature (TypeScript)
- Files, Folders & Packages: `lowercase` (e.g., `shoppingcart.zig`).
- Namespaces, Classes, Enums, Structs, Interfaces: `PascalCase` (e.g., `ShoppingCart`).
- Functions & Methods: `camelCase` (e.g., `addItem`, `totalItem`).
- Normal Variables, Parameters and Arguments: `camelCase` (e.g., `userId`).
- Constants, Final and Global Variables: `UPPER_SNAKE_CASE` (e.g., `MAX_ITEMS`).

### Structure & Formatting

- File Header: Every file must start with a header comment that includes the File Name and Purpose.
- Top-Level Imports: Imports must be placed at the very top of the file, immediately following the header comment.
- Top-Level Declarations: All Global, Final, Constant, and Static variables must be declared at the top of the file, immediately after the imports.
- Bracket Placement: All brackets—including those for Namespaces, Classes, Structs, Enums, Methods, Functions, and Conditional Statements—must start on the same line to reduce the number of lines.
- Unified Structural Comments: Every Namespace, Module, Class, Struct, Enum, Union, Interface, Method, and Function must have exactly one block comment or docstring placed directly above its definition. The comment must be a clear, concise description explaining either what it does or why it exists, avoiding obvious line-by-line repetitions of the code syntax. Do not include verbose, explicit breakdowns for parameters or return values unless the context is highly abstract or unusual. Inside functions and methods, group code together and write a small one-line comment directly above the block explaining what it does or why it exists.
- Code Formatting: Use Newspaper Code Structure which organizing the code vertically, where high level concepts are at the top and as you move down through the file the implementation details increase, and the lowest level helper functions sit at the very bottom.

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
