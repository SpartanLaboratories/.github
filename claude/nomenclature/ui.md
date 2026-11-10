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
- **Every term is a proper noun**, written as one CamelCase word wherever it is used, prose
  included; a one-word term is capitalised too: a Panel, a Card, a ShareBar. The same word in its
  everyday sense, not naming the element, stays lower case (a line of prose, a group of steps).
- **A library is bound by name only.** It need not build every element in this file, but an
  element it builds under a name from this file matches that name's definition.
- **The two sections never share a name.** A basic element is never called by a specific
  element's name, and a specific element is never called by a basic one's: a Group with a
  background is a Group, and it is a Panel only when it does what a Panel does.
- **Specific elements are named by function, never by look.** The look belongs to the consumer's
  own rules (its colours, its Legends, its motion).
- **A compound name puts the subject first and the type last** (a status Pill, a link Chip, a
  summary Tile), the type word taken from this file, so the type vocabulary stays small. The
  subject is the consumer's.
- **A word in neither section names no element.** "Bubble" is retired: what it named is a Card.
  "Glow" is retired: what it named is a FillPulse. A term line with `"case":"any"` rules its
  words out in lower case too.
- **Adding a term.** An element none of these terms describes is added here first, in the
  section it belongs to, with its function and what it is built from, before any consumer names
  it. A term is never reused for a second element.

## 1. Basic elements

Built from nothing else in this list. Every interface element is one of these or is built from
them.

| Term | What it is |
|------|------------|
| **Box** | A rectangle with a fill colour, its corners square or rounded, up to a circle. |
| **Text** | A run of characters in one style: font, size, colour and alignment. A glyph (☀, ✓) is Text. |
| **Image** | A rectangle that shows a picture, raster or vector, as one unit. |
| **Line** | A stroke along two or more points, straight or curved, with an optional head at either end. |
| **Group** | Holds other elements and places them, with an optional background (a Box behind its children) and opt-in clipping and scrolling. It has no look of its own beyond that background. |

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
| **Panel** | A region that holds other elements under its own heading: a title, or the element that names what it holds (a Tab's heading, the control that shows it; the Card at its head). A Panel may hold Panels. | a Group, often with a background and an outline, its heading first or attached to it. A Group with no heading is layout, not a Panel. |
| **Card** | A self-contained statement inside a Panel, with a title and a body, readable alone. | a Box with an outline, holding a Group: a title (Text) over a body of Text and other elements, with any Labels it carries. |
| **TextBoard** | A self-contained block of text inside a Panel, like a Card but holding only that text: no title, no other elements. | a Box with an outline holding Text, laid out on its own line. |
| **Cell** | The intersection of a Row and a column in a table. | a Box, or a bare Group, at one Row and one column, holding Text and other elements. |
| **Row** | One subject across a table's columns. | a Group of Cells in a line, led by its subject's name. |

```jsonl
{"term":"Card","not":["Bubble"]}
```

- Kinds of Panel:

  | Term | Function | Built from |
  |------|----------|------------|
  | **Tab** | One of a set of Panels that share a place, only one shown at a time; its heading is the control that shows it. | a Panel, headed by an interactive Text or Box in a row of the set's headings. |
  | **Disclosure** | A region whose body is shown or hidden in place by its own heading, independently of its neighbours; a Panel whose heading is interactive. | a Panel whose heading is interactive. |

- Kinds of Card:

  | Term | Function | Built from |
  |------|----------|------------|
  | **Tile** | A Card whose body is one figure with its Legend. It may contain a Bar (a ShareBar or a SlotBar) that draws the figure's parts. | a Box with an outline, holding a Group: a title (Text) over the figure (Text) and the Legend's entries. |

- Kinds of TextBoard:

  | Term | Function | Built from |
  |------|----------|------------|
  | **CodeBlock** | A TextBoard whose text is code, shown verbatim and set apart as code: monospace, its whitespace kept, wrapping inside itself. | a TextBoard holding monospace Text, its whitespace kept. |

**Labels, by what they say**

| Term | Function | Built from |
|------|----------|------------|
| **Label** | A short text that names or states one thing. | Text, alone or on a Box. |

- Kinds of Label; a Label of none of them is a plain label:

  | Term | Function | Built from |
  |------|----------|------------|
  | **Pill** | A state word with its glyph, in a status colour. | a Box outlined, and optionally tinted, in the status colour, holding Text: the glyph and the word. |
  | **Chip** | A reference that names or opens something, neutral. | a Box with a neutral outline holding Text; interactive when it opens what it names. |
  | **Badge** | A count or classification fixed to a Card's corner. | a small Box holding Text, placed on the corner. |
  | **Tag** | Plain text over an element that classifies it without a status colour. | Text, alone or on an outlined Box, never in a status colour. |
  | **CodeLabel** | A short run of code inside text, set apart as code. | a Box with a faint fill and a hairline outline holding monospace Text. |

  - Kinds of Pill:

    | Term | Function | Built from |
    |------|----------|------------|
    | **DualStatePill** | A Pill that shows two independent states of one thing at once, each on its own scale. | a Box holding two parts side by side, each with its own Text and its own colour scale. |

**Bars, by what they measure**

| Term | Function | Built from |
|------|----------|------------|
| **Bar** | A strip that shows how a whole stands along one axis: its parts, its slots or its steps. | a Group of Boxes along one axis, the whole its length. |

- Kinds of Bar:

  | Term | Function | Built from |
  |------|----------|------------|
  | **ShareBar** | The parts of a total, each as long as its share of it. | a Group of Boxes in a row, one per part. |
  | **SlotBar** | Outcomes out of a maximum, one slot each. | a Group of Boxes in a row, one per slot up to the maximum, each showing its outcome or left empty. |
  | **StatBar** | A value out of its total. | a Group of two Boxes: the whole, and over it the value's length. |
  | **StepBar** | The steps of a sequence in order, and where things stand: each step done, current or to come. | a Group of chevron-shaped Boxes in a row, one per step, each holding a Text label or none. |

  - Kinds of ShareBar:

    | Term | Function | Built from |
    |------|----------|------------|
    | **Timeline** | A ShareBar of time: the steps' shares of the total time spent. | a Group of Boxes in a row, one per step, each as long as its share of the time. |

**Marks, by what they overlay**

| Term | Function | Built from |
|------|----------|------------|
| **Ring** | A border-only state on an element: its outline changes, its fill does not. | the outline of the element it marks. |
| **Pulse** | A breathing glow on an element: an accent that swells and fades in a slow, steady rhythm. | a tint or outline of the element, its strength animated in a loop, holding still at its middle strength when reduced motion is asked for. |
| **Arrow** | A directed connector from one element into another, showing that the first leads to or feeds the second. | a Line with a head at the end it points to. |
| **Tracer** | A Line that ties a summary figure to the part of another element it was drawn from, labelled with that part's value. | a Line in the colour of what it traces, with Text at one end. |
| **Legend** | The key to a grouping by colour, shade or dash: one entry per value, each a sample and its name. | a Group of entries, each a small Box (the swatch) or a short Line, with Text. |

- Kinds of Pulse:

  | Term | Function | Built from |
  |------|----------|------------|
  | **RingPulse** | A Pulse on an element's outline. | the element's outline, its glow animated. |
  | **FillPulse** | A Pulse on an element's interior. | a tint of the element's fill, animated. |
  | **FullPulse** | A Pulse on both the outline and the interior at once. | a RingPulse and a FillPulse together. |

  ```jsonl
  {"term":"FillPulse","not":["Glow"]}
  ```

**Controls, by what they change**

| Term | Function | Built from |
|------|----------|------------|
| **Switch** | A two-state control that shows its state as a position: a knob on a track, at the side of the state shown. It is operable from the keyboard and exposed to assistive technology as a switch with its state. | a Group: the track (a rounded Box) and the knob (a round Box), interactive. The knob moves to the side of the state shown, sliding, or jumping when reduced motion is asked for. |
| **Button** | A control that performs one action when activated. | a Box holding Text or an Image, interactive. |
