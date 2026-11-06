# UI elements — one name per element

The names of the elements an interface is built from, for any interface that uses them: the
dashboards' boards, a UI library such as SpartanUI, or anything else drawn to the same
vocabulary. The names are generic: none belongs to one interface, and each consumer keeps its own
usage (where an element stands, its colours, its examples) in its own rules.

The list has two sections:

1. **Basic elements**, the construction primitives, each named by what it is built from.
2. **Specific elements**, composed from the basic ones, each named by what it does, with what
   it is built from in section 1's terms.

## Naming

- **One name, one element.** A term names one element and means what this file says wherever it
  is used: in a document, a word on screen, a type in code. An element that takes a name from
  this file does what the file defines; one that does something else takes another name.
- **A library is bound by name only.** It need not build every element in this file, but an
  element it builds under a name from this file matches that name's definition.
- **The two sections never share a name.** A basic element is never called by a specific
  element's name, and a specific element is never called by a basic one's: a group with a
  background is a group, and it is a panel only when it does what a panel does.
- **Specific elements are named by function, never by look.** The look belongs to the consumer's
  own rules (its colours, its legends, its motion).
- **A compound name puts the subject first and the type last** (`status pill`, `link chip`,
  `summary tile`, `step cell`), the type word taken from this file, so the type vocabulary stays
  small. The subject is the consumer's.
- **A word in neither section names no element.** "Bubble" is retired: what it named is a card.
- **Adding a term.** An element none of these terms describes is added here first, in the
  section it belongs to, with its function and what it is built from, before any consumer names
  it. A term is never reused for a second element.

## 1. Basic elements

Built from nothing else in this list. Every interface element is one of these or is built from
them.

| Term | What it is |
|------|------------|
| **Box** | A rectangle with a fill colour, its corners square or rounded, up to a circle. |
| **Text** | A run of characters in one style: font, size, colour and alignment. A glyph (☀, ✓) is text. |
| **Image** | A rectangle that shows a picture, raster or vector, as one unit. |
| **Line** | A stroke along two or more points, straight or curved, with an optional head at either end. |
| **Group** | Holds other elements and places them, with an optional background (a box behind its children) and opt-in clipping and scrolling. It has no look of its own beyond that background. |

**What every basic element may carry:**

- a **position** in its parent and a **size**;
- an **outline**: a border of a colour, thickness and margin, solid or dashed;
- an **opacity**;
- **input**: hit-testing, focus and triggers. An element that takes input is interactive; one
  that does not is drawn only.

## 2. Specific elements

Composed from the basic elements. Each is named by what it does.

**Containers, by how much they hold**

| Term | Function | Built from |
|------|----------|------------|
| **Panel** | A region that holds other elements under its own heading: a title, or the element that names what it holds (the tab that shows it, the card at its head). A panel may hold panels. | a Group, often with a background and an outline, its heading first or attached to it. A group with no heading is layout, not a panel. |
| **Card** | A self-contained statement inside a panel, with a title and a body, readable alone. | a Box with an outline, holding a Group: a title (Text) over a body of Text and other elements, with any labels it carries. |
| **Tile** | A card whose body is one figure with its legend. It may contain a bar (a ShareBar or a SlotBar) that draws the figure's parts. | a Box with an outline, holding a Group: a title (Text) over the figure (Text) and the legend's entries. |
| **Cell** | The intersection of a row and a column in a table. | a Box, or a bare Group, at one row and one column, holding Text and other elements. |
| **Row** | One subject across a table's columns. | a Group of cells in a line, led by its subject's name. |

**Labels, by what they say**

A **Label** is the element; **Pill**, **Chip**, **Badge** and **Tag** are its kinds. A label of none
of them is a plain label.

| Term | Function | Built from |
|------|----------|------------|
| **Label** | A short text that names or states one thing. | Text, alone or on a Box. |
| **Pill** | A state word with its glyph, in a status colour. | a Box outlined, and optionally tinted, in the status colour, holding Text: the glyph and the word. |
| **Chip** | A reference that names or opens something, neutral. | a Box with a neutral outline holding Text; interactive when it opens what it names. |
| **Badge** | A count or classification fixed to a card's corner. | a small Box holding Text, placed on the corner. |
| **Tag** | Plain text over an element that classifies it without a status colour. | Text, alone or on an outlined Box, never in a status colour. |

**Bars, by what they measure**

A **Bar** is the element; **ShareBar**, **SlotBar**, **StatBar** and **StepBar** are its kinds,
and a **Timeline** is a kind of ShareBar. A kind's name is a proper noun, written as one CamelCase
word wherever it is used, prose included.

| Term | Function | Built from |
|------|----------|------------|
| **Bar** | A strip that shows how a whole stands along one axis: its parts, its slots or its steps. | a Group of Boxes along one axis, the whole its length. |
| **ShareBar** | The parts of a total, each as long as its share of it. | a Group of Boxes in a row, one per part. |
| **Timeline** | A ShareBar of time: the steps' shares of the total time spent. | a Group of Boxes in a row, one per step, each as long as its share of the time. |
| **SlotBar** | Outcomes out of a maximum, one slot each. | a Group of Boxes in a row, one per slot up to the maximum, each showing its outcome or left empty. |
| **StatBar** | A value out of its total. | a Group of two Boxes: the whole, and over it the value's length. |
| **StepBar** | The steps of a sequence in order, and where things stand: each step done, current or to come. | a Group of chevron-shaped Boxes in a row, one per step, each holding a Text label or none. |

**Marks, by what they overlay**

| Term | Function | Built from |
|------|----------|------------|
| **Ring** | A border-only state on an element: its outline changes, its fill does not. | the outline of the element it marks. |
| **Glow** | The interior accent on whatever is in progress. | a tint of the element's fill, pulsing. |
| **Arrow** | A directed connector from one element into another, showing that the first leads to or feeds the second. | a Line with a head at the end it points to. |
| **Tracer** | A line that ties a summary figure to the part of another element it was drawn from, labelled with that part's value. | a Line in the colour of what it traces, with Text at one end. |
| **Legend** | The key to a grouping by colour, shade or dash: one entry per value, each a sample and its name. | a Group of entries, each a small Box (the swatch) or a short Line, with Text. |

**Controls, by what they change**

| Term | Function | Built from |
|------|----------|------------|
| **Switch** | A two-state control that shows its state as a position: a knob on a track, at the side of the state shown. It is operable from the keyboard and exposed to assistive technology as a switch with its state. | a Group: the track (a rounded Box) and the knob (a round Box), interactive. The knob moves to the side of the state shown, sliding, or jumping when reduced motion is asked for. |
| **Button** | A control that performs one action when activated. | a Box holding Text or an Image, interactive. |
