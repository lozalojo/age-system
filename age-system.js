// import * as Macros from "./modules/macros.js";
import {ageSystem} from "./modules/config.js";
import ageSystemItemSheet from "./modules/sheets/ageSystemItemSheet.js";
import ageSystemCharacterSheet from "./modules/sheets/ageSystemCharacterSheet.js";
import ageSystemVehicleSheet from "./modules/sheets/ageSystemVehicleSheet.js";
import ageSystemSpaceshipSheet from "./modules/sheets/ageSystemSpaceshipSheet.js";
import ageActiveEffectConfig from "./modules/sheets/ageActiveEffectConfig.js";
import {ageSystemActor} from "./modules/ageSystemActor.js";
import {ageSystemItem} from "./modules/ageSystemItem.js";
import { createAgeMacro } from "./modules/macros.js";
import { rollOwnedItem } from "./modules/macros.js";
import { AgeRoller } from "./modules/age-roller.js";
import { AgeTracker } from "./modules/age-tracker.js";

import * as Settings from "./modules/settings.js";
import * as AgeChat from "./modules/age-chat.js";
import * as Setup from "./modules/setup.js";
import * as migrations from "./modules/migration.js";

async function preloadHandlebarsTemplates() {
    const path = `systems/age-system/templates/partials/`;
    const templatePaths = [
        `${path}bonus-desc-sheet.hbs`,
        `${path}dmg-block-sheet.hbs`,
        `${path}bonuses-sheet.hbs`,
        `${path}active-bonuses.hbs`,
        `${path}ability-focus-select.hbs`,
        `${path}/cost-resource-block.hbs`,
        `${path}play-aid-bar.hbs`,
        `${path}item-image-sheet-card.hbs`,
        `${path}conditions-block.hbs`,
        `${path}char-sheet-nav-bar.hbs`,
        `${path}char-sheet-tab-main.hbs`,
        `${path}char-sheet-tab-persona.hbs`,
        `${path}char-sheet-tab-effects.hbs`,
    ];

    return loadTemplates(templatePaths);
};

Hooks.once("init", async function() {
    const ageSystemText = `
     ___   ____________   _____            __               
    /   | / ____/ ____/  / ___/__  _______/ /____  ____ ___ 
   / /| |/ / __/ __/     \\__ \\/ / / / ___/ __/ _ \\/ __ \`__ \\
  / ___ / /_/ / /___    ___/ / /_/ (__  ) /_/  __/ / / / / /
 /_/  |_\\____/_____/   /____/\\__, /____/\\__/\\___/_/ /_/ /_/ 
                            /____/                          `;

    console.log("age-system | Entering a new AGE...");
    console.log(ageSystemText);

    // Create a namespace within the game global
    game.ageSystem = {
        applications: {
            ageSystemCharacterSheet,
            ageSystemVehicleSheet,
            ageSystemSpaceshipSheet,
            ageActiveEffectConfig,
            ageSystemItemSheet,
            AgeRoller,
            AgeTracker
        },
        migrations: migrations,
        rollOwnedItem,
        entities: {
            ageSystemActor,
            ageSystemItem
        }
    };

    CONFIG.ageSystem = ageSystem;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("age-system", ageSystemCharacterSheet, {
        types: ["char"],
        makeDefault: true,
        label: "age-system.SHEETS.standardChar"
    });
    Actors.registerSheet("age-system", ageSystemVehicleSheet, {
        types: ["vehicle"],
        makeDefault: true,
        label: "age-system.SHEETS.standardVehicle"
    });
    Actors.registerSheet("age-system", ageSystemSpaceshipSheet, {
        types: ["spaceship"],
        makeDefault: true,
        label: "age-system.SHEETS.standardSpaceship"
    });
    
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("age-system", ageSystemItemSheet, {
        makeDefault: true,
        label: "age-system.SHEETS.standardItem"
    });

    game.ageSystem.ageRoller = new AgeRoller({
        popOut: false,
        minimizable: false,
        resizable: false,
    });

    game.ageSystem.ageTracker = new AgeTracker({
        popOut: false,
        minimizable: false,
        resizable: false
    });

    // Define extra data for Age System (Actors, Items, ActiveEffectConfig)
    CONFIG.Actor.documentClass = ageSystemActor;
    CONFIG.Item.documentClass = ageSystemItem;
    CONFIG.ActiveEffect.sheetClass = ageActiveEffectConfig;

    // Load partials for Handlebars
    preloadHandlebarsTemplates();

    // Register System Settings
    Settings.registerSystemSettings();

    // Useful concat Helper from Boilerplate system!
    Handlebars.registerHelper('concat', function() {
        let outStr = '';
        for (let arg in arguments) {
            if (typeof arguments[arg] != 'object') {
                outStr += arguments[arg];
            }
        }
        return outStr;
    });

    // Handlebar to identify item type
    Handlebars.registerHelper('ageffect', function(mask, options) {
        for (let o = 0; o < options.length; o++) {
            const e = options[o];
            if (e[1] === mask) return e[0]
        }
        return game.i18n.localize("age-system.custom");
    })

    // Handlebar helper to compare 2 data
    Handlebars.registerHelper("when",function(operand_1, operator, operand_2, options) {
        let operators = {
            'eq': function(l,r) { return l == r; },
            'noteq': function(l,r) { return l != r; },
            'gt': function(l,r) { return Number(l) > Number(r); },
            'or': function(l,r) { return l || r; },
            'and': function(l,r) { return l && r; },
            '%': function(l,r) { return (l % r) === 0; }
        },
        result = operators[operator](operand_1,operand_2);
      
        if (result) return options.fn(this);
        else return options.inverse(this);
    });

    // Keep a list of actors that need to prepareData after 'ready' (generally those that rely on other actor data - passengers/mounts)
    game.postReadyPrepare = [];

});

Hooks.once("setup", function() {
    // Localize conditions
    for (let c = 0; c < ageSystem.conditions.length; c++) {
        const cond = ageSystem.conditions[c];
        ageSystem.conditions[c].name = game.i18n.localize(ageSystem.conditions[c].name);
        ageSystem.conditions[c].desc = game.i18n.localize(ageSystem.conditions[c].desc);
    }

    // Localize Abilities' name
    Setup.abilitiesName();

    // Localize Effects Name and build object
    Setup.localizeAgeEffects();

});

Hooks.once("ready", async function() {
    // Identify Colorset
    const color = game.user.getFlag("age-system", "colorScheme");
    if (color) game.settings.set("age-system", "colorScheme", color);
    if (!color) game.user.setFlag("age-system", "colorScheme", game.settings.get("age-system", "colorScheme"));
    // Register color scheme on global name space
    ageSystem.colorScheme = game.settings.get("age-system", "colorScheme");

    // Tracker Handling
    // Identify if User already has ageTrackerPos flag set
    const userTrackerFlag = await game.user.getFlag("age-system", "ageTrackerPos");
    const useTracker = (game.settings.get("age-system", "serendipity") || game.settings.get("age-system", "complication") !== "none") ? true : false;
    if (!userTrackerFlag) await game.user.setFlag("age-system", "ageTrackerPos", ageSystem.ageTrackerPos);
    if (useTracker) game.ageSystem.ageTracker.refresh();

    // Age Roller
    // Handle Usef Flag
    const rollerFlag = await game.user.getFlag("age-system", "ageRollerPos");
    if (!rollerFlag) await game.user.setFlag("age-system", "ageRollerPos", ageSystem.ageRollerPos);
    game.ageSystem.ageRoller.refresh()

    // Check if Dice so Nice is active to register Stunt Die option
    if (game.modules.get("dice-so-nice") && game.modules.get("dice-so-nice").active) {
        import("/modules/dice-so-nice/DiceColors.js").then((diceColors) => {
            
            const colorset = diceColors.COLORSETS;
            let colorChoices = {};
            for (const type in colorset) {
                if (colorset.hasOwnProperty(type)) {
                    const colorCode = colorset[type].name;
                    const colorName = colorset[type].description;
                    const newChoice = {[colorCode]: colorName}
                    colorChoices = {
                    ...colorChoices,
                    ...newChoice
                    };
                };
            };
            if (colorChoices !== {} && colorChoices) {
                // After loading all modules, check if Dice so Nice is installed and add option to select Stunt Die colorset                
                Settings.stuntSoNice(colorChoices);
                // Identify if user has registered Dice so Nice Stunt Die option
                const stuntSoNiceFlag = game.user.getFlag("age-system", "stuntSoNice");
                if (stuntSoNiceFlag) game.settings.set("age-system", "stuntSoNice", stuntSoNiceFlag);
                if (!stuntSoNiceFlag) game.user.setFlag("age-system", "stuntSoNice", game.settings.get("age-system", "stuntSoNice"));
            };
        });
    };

    // Prepare Actors dependent on other Actors
    for(let e of game.postReadyPrepare){
        e.prepareData();
    }
    
    // Register System Settings related do Focus Compendium
    Settings.loadCompendiaSettings();
    const setCompendium = game.settings.get("age-system", "masterFocusCompendium");
    ageSystem.focus = Settings.compendiumList(setCompendium);

    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on("hotbarDrop", (bar, data, slot) => createAgeMacro(data, slot));

    // // Determine whether a system migration is required and feasible
    if ( !game.user.isGM ) return;
    const currentVersion = game.settings.get("age-system", "systemMigrationVersion");
    const NEEDS_MIGRATION_VERSION = "0.5.0";
    // const COMPATIBLE_MIGRATION_VERSION = "0.7.9";
    const needsMigration = currentVersion && isNewerVersion(NEEDS_MIGRATION_VERSION, currentVersion);
    if ( !needsMigration ) return;

    // Perform the migration
    // if ( currentVersion && isNewerVersion(COMPATIBLE_MIGRATION_VERSION, currentVersion) ) {
    //     const warning = `Your AGE System data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`;
    //     ui.notifications.error(warning, {permanent: true});
    // }
    migrations.migrateWorld();

});

// If Compendia are updated, then compendiumList is gathered once again
Hooks.on("renderCompendium", function() {
    const setCompendium = game.settings.get("age-system", "masterFocusCompendium");
    ageSystem.focus = Settings.compendiumList(setCompendium);
});

Hooks.on("renderageSystemItemSheet", (app, html, data) => {
    // Add item type on title bar
    Setup.nameItemSheetWindow(app);
});

Hooks.on("renderageSystemCharacterSheet", (app, html, data) => {
    // Hide primary Abilities checkbox
    Setup.hidePrimaryAblCheckbox(html);
});

Hooks.on("renderChatLog", (app, html, data) => AgeChat.addChatListeners(html));

Hooks.on("renderChatMessage", (app, html, data) => {
    // Hide chat message when rolling to GM
    AgeChat.selectBlindAgeRoll(app, html, data);
});

// Prevent Items to be created on non campatible Actor types
Hooks.on("preCreateItem", (itemCreated, itemCreatedData, data, userId) => {
    const actor = itemCreated.actor;
    const itemName = itemCreatedData.name
    const itemType = itemCreatedData.type

    // Avoid dropping Item on Vehicle
    if (actor.type === "vehicle") {
        ui.notifications.warn(`Items can not be droped on Vehicle Actor type.`);
        return data.temporary = true;
    };

    // Ensure only Spaceship Features are droped on Spaceships
    if (actor.type === "spaceship" && itemType !== "shipfeatures") {
        let warning = game.i18n.localize("age-system.WARNING.nonShipPartsOnShip");
        ui.notifications.warn(warning);
        return data.temporary = true;
    }
    
    // Prevent adding spaceship features to Actors
    if (actor.type === "char" && itemType === "shipfeatures") {
        let warning = game.i18n.localize("age-system.WARNING.shipPartsOnChar");
        ui.notifications.warn(warning);
        return data.temporary = true;
    }
    
    // Avoid Focus with repeated name on Actors
    if (actor.type === "char" && itemType === "focus") {
        const hasFocus = actor.items.filter(f => f.name === itemCreatedData.name && f.type === "focus");
        if (hasFocus.length > 0) {
            let warning = game.i18n.localize("age-system.WARNING.duplicatedFocus");
            warning += `"${itemName.toUpperCase()}"`;
            ui.notifications.warn(warning);
            return data.temporary = true;
        }
    }
})

// Creates Standard Conditions (Active Effect) when actor is created
Hooks.on("createActor", (actor, data, actorId) => {
    if (actor.data.type !== "char") return;
    // Creating each Active Effect
    // Definition of basic conditions
    const conditions = [
        {
            label: game.i18n.localize("age-system.conditions.blinded"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/defensive/illusion-evasion-echo-purple.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.blindedDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.deafened"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/sonic/bell-alarm-red-purple.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.deafenedDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.dying"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/life/heart-broken-red.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.dyingDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.exhausted"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/unholy/strike-body-explode-disintegrate.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.exhaustedDesc")
                }
            },
            changes: [{
                key: "data.speed.total",
                mode: 1,
                value: "0.5"
            }]
        },
        {
            label: game.i18n.localize("age-system.conditions.fatigued"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/unholy/strike-body-life-soul-purple.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.fatiguedDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.freefalling"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/air/air-pressure-shield-blue.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.freefallingDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.helpless"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/control/sihouette-hold-beam-green.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.helplessDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.hindered"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/control/debuff-chains-shackles-movement-blue.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.hinderedDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.injured"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/skills/wounds/injury-face-impact-orange.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.injuriedDesc")
                }
            },
            changes: [{
                key: "data.speed.total",
                mode: 1,
                value: "0.5"
            },
            {
                key: "data.testMod",
                mode: 2,
                value: "-1"
            }]
        },
        {
            label: game.i18n.localize("age-system.conditions.prone"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/skills/wounds/injury-face-impact-orange.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.proneDesc")
                }
            }
        },
        {
            label: game.i18n.localize("age-system.conditions.restrained"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/control/debuff-chains-shackles-movement-purple.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.restrainedDesc")
                }
            },
            changes: [{
                key: "data.speed.total",
                mode: 5,
                value: "0"
            }]
        },
        {
            label: game.i18n.localize("age-system.conditions.unconscious"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/magic/control/silhouette-fall-slip-prone.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.unconsciousDesc")
                }
            },
            changes: [{
                key: "data.speed.total",
                mode: 5,
                value: "0"
            }]
        },
        {
            label: game.i18n.localize("age-system.conditions.wounded"),
            disabled: true,
            origin: actor.uuid,
            icon: "icons/skills/wounds/injury-face-impact-orange.webp",
            duration: {
                startRound: 1,
                rounds: 9999,
            },
            flags: {
                "age-system": {
                    type: "conditions",
                    description: game.i18n.localize("age-system.conditions.woundedDesc")
                }
            },
            changes: [{
                key: "data.speed.total",
                mode: 1,
                value: "0.5"
            },
            {
                key: "data.testMod",
                mode: 2,
                value: "-2"
            }]
        }
    ]
    actor.createEmbeddedDocuments("ActiveEffect", conditions);
})