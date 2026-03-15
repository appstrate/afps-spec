# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in the AFPS specification, please report it responsibly. Do not open a public issue.

**Preferred contact methods:**

- **GitHub Security Advisories**: Use the [Security Advisories](https://github.com/appstrate/afps-spec/security/advisories/new) feature on this repository.
- **Email**: [security@appstrate.dev](mailto:security@appstrate.dev)

Please include:

- A description of the vulnerability and its potential impact
- The affected section of the specification, schema, or example
- Steps to reproduce or a proof of concept, if applicable

## Scope

The following are in scope for this security policy:

- **Specification text** that could lead implementers to produce insecure software (e.g., missing validation requirements, ambiguous security constraints, unsafe defaults)
- **JSON Schema files** in `schema/` that fail to enforce security-relevant constraints defined in the spec
- **Examples** in `examples/` that demonstrate insecure patterns

## Out of Scope

- Vulnerabilities in specific implementations of AFPS (report those to the implementation's own repository)
- General questions or feature requests (use the issue tracker instead)

## Disclosure Timeline

We follow a 90-day responsible disclosure timeline:

1. **Acknowledgment**: We will acknowledge receipt of your report within 5 business days.
2. **Assessment**: We will evaluate the report and determine its impact on the specification.
3. **Resolution**: We aim to publish a spec revision or advisory within 90 days of the initial report.
4. **Disclosure**: After the fix is published, you are welcome to disclose the vulnerability publicly.

If we determine the issue requires more than 90 days to address, we will communicate a revised timeline and work with you on coordinated disclosure.

## Recognition

We appreciate security researchers who help improve the specification. With your permission, we will credit you in the relevant changelog entry or advisory.
