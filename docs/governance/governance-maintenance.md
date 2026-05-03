---
language: en-US
audience: agent
doc_type: normative
---

# Governance Maintenance

## Mandatory AGENTS.md Updates

Update `AGENTS.md` in the same change when you:

- Add a governance document.
- Delete a governance document.
- Rename or move a governance document.
- Change which workflow applies to a task type.
- Add or remove an agent adapter file.
- Add a new mandatory workflow.

## Usually No AGENTS.md Update Needed

- Typo fixes.
- Examples inside an existing governance document.
- Wording changes that do not alter routing, scope, or mandatory workflow.

## Code & Order Provenance

`docs/governance/code-and-order.lock.json` records:

- Code & Order source repo, branch, and commit.
- Initializer config such as suite, TDD mode, and starter spec id.
- Managed governance files with template hashes and local hashes at write time.

Use the initializer to manage the lockfile:

```bash
python scripts/init_governance.py . --audit
python scripts/init_governance.py . --adopt
python scripts/init_governance.py . --update --dry-run
python scripts/init_governance.py . --update
```

## Drift Status

- `current`: local file matches the managed template.
- `upstream-available`: local file is unchanged locally and a newer template is available.
- `local-customized`: local file differs from the managed template, while the template has not changed.
- `needs-merge`: local file was customized and the template also changed.
- `missing`: managed file is absent locally.
- `new-template`: current Code & Order has a managed file not present in the lockfile.

Safe updates may automatically refresh `upstream-available` files and create missing `new-template` files. They must not overwrite `local-customized` or `needs-merge` files.
