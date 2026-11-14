# The Java floor
<!-- {"name":"The Java floor","code":"P-B-J-F","id":134} -->

## A floor apart from the toolchain
<!-- {"name":"A floor apart from the toolchain","code":"P-B-J-F-FT","id":1096} -->

A repository that builds for the JVM sets a Java floor: the oldest Java release its compiled
output runs on. The floor is set on its own, apart from the toolchain that runs the build.

## The organization floor is 11
<!-- {"name":"The organization floor is 11","code":"P-B-J-F-OF","id":1097} -->

No repository sets a floor below 11. A repository may set a higher one at its own discretion.

## The worked example
<!-- {"name":"The worked example","code":"P-B-J-F-WE","id":1098} -->

WebTools: one constant sets the Kotlin `jvmTarget` and `-Xjdk-release`, the floor is published as
the `TargetJvmVersion` attribute, and a `verifyJavaFloor` task guards it in `check`.
