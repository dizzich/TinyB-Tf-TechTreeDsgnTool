# Design Prompts: Trainfort Map Tool

This folder contains a set of prompts and documentation that describe the visual design and layout of the Trainfort Map Tool. These files can be used to replicate the design in other projects or to guide an AI in generating similar UI components.

## Files

1.  **[01_design_system.md](01_design_system.md):** Defines the core design values (colors, typography, spacing, shadows).
2.  **[02_layout_structure.md](02_layout_structure.md):** Describes the high-level layout (sidebar, workspace, tool rail).
3.  **[03_components.md](03_components.md):** Details the HTML structure and styling for reusable components (buttons, inputs, panels).
4.  **[04_icons_and_assets.md](04_icons_and_assets.md):** Explains the iconography and asset usage.
5.  **[05_tech_stack_context.md](05_tech_stack_context.md):** Provides context on the technical implementation (vanilla JS/CSS).

## Usage

To use these prompts with an AI assistant:

1.  **Context:** Provide the content of `01_design_system.md` and `05_tech_stack_context.md` to establish the design language and technical constraints.
2.  **Specific Task:** If you need a specific component (e.g., a modal), provide the relevant section from `03_components.md` or `02_layout_structure.md`.
3.  **Generation:** Ask the AI to generate the HTML/CSS for your specific need based on the provided design system.

Example Prompt:
> "Using the design system defined in `01_design_system.md`, create a new modal dialog for user settings. Follow the structure described in `03_components.md` for modals."
