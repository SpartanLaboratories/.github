# Logging
<!-- {"name":"Logging","code":"P-L","id":30,"pointerMark":1} -->

## Kotlin code logs through kotlin-logging
<!-- {"name":"Kotlin code logs through kotlin-logging","code":"P-L-KL","id":1084} -->

All Kotlin code logs through kotlin-logging: multiplatform code, JVM-only libraries and
applications alike. On the JVM kotlin-logging runs on slf4j.

## A library ships no logging backend
<!-- {"name":"A library ships no logging backend","code":"P-L-NB","id":1085} -->

A library publishes no logging backend among its dependencies. logback is the backend for tests.

## One kotlin-logging version
<!-- {"name":"One kotlin-logging version","code":"P-L-OV","id":1086} -->

The organization uses one kotlin-logging version, 8.0.7. It is an internal dependency
and never appears in a library's public API.

## What is logged
<!-- {"name":"What is logged","code":"P-L-WL","id":1087} -->

Structured logging at key lifecycle events, data flows and failure states.
