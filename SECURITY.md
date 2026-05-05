# Security policy

## Reporting a vulnerability

iCELL is a research tool that runs locally inside Docker. The blast radius of a security issue is small — there is no remote service, no shared database, no user accounts. Even so, please **do not file a public GitHub issue** for security-relevant findings.

Email the maintainer instead:

- **Taka Ariyaberg** — `taka.ariyaberg@uu.se`

Please include:

1. A short description of the issue.
2. Repro steps (or a minimal example).
3. The version / commit SHA you observed it on.
4. Your suggested fix, if you have one.

You can expect an acknowledgement within a few working days. We will work with you on a coordinated disclosure timeline if the issue warrants it.

## Supported versions

The project follows semantic versioning. Only the latest minor release on `main` is supported; please upgrade before reporting.

## Dependency security

Dependency updates are tracked through GitHub Dependabot — see [`.github/dependabot.yml`](.github/dependabot.yml). If you find a vulnerability in a transitive dependency, the same private email path applies.