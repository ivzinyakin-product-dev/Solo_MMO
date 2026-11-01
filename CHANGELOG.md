# Changelog

All notable changes to **Solo MMO: Midgard Camp** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2026-11-01
### Changed
- **CI/CD Workflow**: Removed GitHub Pages deployment and related artifacts from `.github/workflows/release.yml`. Releases now focus strictly on automated tagging, building, and publishing release zip assets.

## [1.0.1] - 2026-11-01
### Changed
- **Documentation**: Adapted and updated `README.md` to fully reflect the actual state of the game:
  - Added documentation for all 10 open zones and their respective MVP bosses (Golden Bug, Poring King, Wolf Leader, Drake, Maya Queen, Orc Lord, Dark Lord, Stormy Knight, Ifrit).
  - Documented the full Ragnarok Online Job Tree across 1st and 2nd classes (Knight, Crusader, Hunter with Falcon Companion, Bard, Wizard, Sage, Priest, Monk).
  - Described the Meadow Roaming auto-hunting system with 3-tier target selection and obstacle-aware pathfinding.
  - Detailed the Blacksmith T1-T5 forging tiers, jewelry attributes, refinement levels (+1..+10) with dynamic weapon glows, ore synthesis, and card extraction.
  - Added full hotkey reference table and GitHub Actions automated release pipeline instructions.

## [1.0.0] - 2026-11-01
### Added
- **Camp Auto-Hunting**: Automated movement between monsters, resource gathering, and combat.
- **Jobs & Classes**: Full Ragnarok Online job tree (Novice -> 1st Classes -> 2nd Classes).
- **A* Pathfinding**: Smart obstacle avoidance for trees, rocks, and camp structures.
- **Blacksmith & Refine**: Equipment crafting (T1-T5), mineral tiers (Copper, Iron, Silver, Gold, Platinum), and weapon glow on refinement (+4/+7/+10).
- **Cards & Sockets**: Monster card dropping, slotting, and passive stat bonuses.
- **Procedural Chibi Visuals**: PixiJS animated characters, weapons, hats, and monster sprites.
- **Zones & MVP**: Progressive zones from Prontera Field to Orc Dungeon with MVP boss encounters.
