# Dokka and project sites

The SpartanLaboratories standard for API documentation and project websites. It covers every
repository of the organization and of its sub-organizations, including SpartanLabsGaming.
[MyGameTools](https://github.com/SpartanLabsGaming/MyGameTools) is the worked example.

## What each repository has

| Requirement | Applies to |
|-------------|------------|
| Dokka javadoc jar | Every library |
| Project site on GitHub Pages | Every repository |
| Landing page | Every repository |
| API reference at `/api/` | Every repository with Kotlin source |
| Dokka job in CI | Every repository with Kotlin source |
| Organization branding | Every repository |

## Generating the documentation

- Use Dokka 2 in its V2 plugin mode.
- In a build with a convention plugin for published modules, apply Dokka there, so that every
  published module gets it the same way.
- Aggregate the modules of a multi-module build into one Dokka publication at the root project.
  Declare each module with `dokka(project(":module"))`.
- Keep the Kotlin plugins on the root project's plugin classpath with `apply false`. Without this,
  Dokka and the Kotlin Gradle plugin load in different classloaders and the modules render empty.

## The javadoc jar

A library publishes the Dokka output as its javadoc jar, never an empty placeholder:

```kotlin
JavadocJar.Dokka("dokkaGeneratePublicationHtml")
```

Every convention plugin that configures publishing sets this, a multiplatform one included.

## Continuous integration

A CI job runs `./gradlew dokkaGeneratePublicationHtml` on each build, so a broken KDoc link fails it.

## The site

- A `website/` folder holds the hand-written landing page.
- A `pages.yml` workflow deploys the site through GitHub Actions on each push to the default
  branch. The repository's Pages source is set to GitHub Actions.
- The workflow copies `website/` to the site root and the aggregated Dokka output, from
  `build/dokka/html`, to `/api/`. It fails if that output is missing.
- The workflow adds a `.nojekyll` file, because Dokka writes names that start with an underscore.
- Deployments do not cancel one another, so that a cancelled run cannot leave the site out of date.

## Branding

- Logos live in `docs/brand/`, and the Dokka stylesheet in `docs/dokka/styles/`.
- Each repository uses the logo of the organization that owns it: Spartan Laboratories, or Spartan
  Gaming.
- In a multi-module build, apply the theme in each module's Dokka configuration as well as at the
  root. Each module renders its own pages with its own configuration, and the root block styles
  only the aggregate index page.
