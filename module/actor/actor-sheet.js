/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
import {alternateContainerType, canFit} from "../inventory/inventory.js";
import {PlayerRoll} from "../rolls/playerRoll.js";
import {SafeNum} from "../misc.js";

export class TorchbearerActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["torchbearer", "sheet", "actor"],
      //template: "systems/torchbearer/templates/actor/actor-sheet.html",
      width: 617,
      height: 848,
      tabs: [
          {
            navSelector: ".sheet-tabs",
            contentSelector: ".sheet-body",
            initial: "description",
          },
          {
            navSelector: ".inventory-tabs",
            contentSelector: ".inventory-body",
            initial: "on-person"
          },
      ],
      dragDrop: [{dragSelector: ".items-list .item", dropSelector: null}]
    });
  }

  /** @override */
  get template() {
    const path = "systems/torchbearer/templates/actor";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;
    return `${path}/${this.actor.data.type}-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.

    // return `${path}/${this.item.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    if(this.actor.data.type !== 'Character') {
      return data;
    }
    // Condition checkboxes
    const conditionStates = [data.data.hungryandthirsty, data.data.angry, data.data.afraid, data.data.exhausted, data.data.injured, data.data.sick, data.data.dead];
    const inc = (100 / 7);
    let conditionsTrue = 0;
    conditionStates.forEach(element => {
      if (element === true) {
        conditionsTrue++;
      }
    });
    data.data.conditionProgress = Math.round(conditionsTrue * inc);

    // Check skills to see if any can be advanced
    let skillsArray = [];
    const skillList = data.data.skills;
    Object.keys(skillList).forEach(key => {
      skillsArray.push(skillList[key].name);
    });
    skillsArray.forEach(key => {
      if (data.data.skills[key].rating > 0) {
        if (data.data.skills[key].pass >= data.data.skills[key].rating && data.data.skills[key].fail >= data.data.skills[key].rating - 1) {
          ui.notifications.info(`You may now advance ${key} from ${data.data.skills[key].rating} to ${data.data.skills[key].rating + 1}`);
        }
      } else if (data.data.skills[key].rating === 0 && data.data.nature.max > 0) {
        if (data.data.skills[key].pass + data.data.skills[key].fail >= data.data.nature.max) {
          ui.notifications.info(`You may now advance ${key} to 2`);
        }
      }
      
    });

    // Check abilities to see if any can be advanced
    let abilitiesArray = ['will', 'health', 'nature', 'resources', 'circles'];
    let displayArray = ['Will', 'Health', 'Nature', 'Resources', 'Circles'];
    abilitiesArray.forEach((key, index) => {
      if (data.data[key].pass === data.data[key].value && data.data[key].fail === data.data[key].value - 1) {
        ui.notifications.info(`You may now advance ${displayArray[index]} from ${data.data[key].value} to ${data.data[key].value + 1}`);
      }
    });

    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    this.html = html;

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    //html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-name.clickable').click(ev => {
      console.log(ev.currentTarget);
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      // const equip = item.data.data.equip;
      item.sheet.render(true);
    });

    // Update Inventory Item
    html.find('.spell-name.clickable').click(ev => {
      const spell = this.actor.getOwnedItem(ev.currentTarget.title);
      console.log(spell);
      spell.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");

      this.actor.removeItemFromInventory(li.data("itemId")).then(() => {
        // Get the equipment slot of the item being deleted
        li.slideUp(200, () => this.render(false));
      });
    });

    // Delete Spell Item
    html.find('.spell-delete').click(ev => {
      document.getElementById(ev.currentTarget.name).remove();
      this.actor.removeItemFromInventory(ev.currentTarget.name);
    });

    // Update spell data
    html.find('.spell-toggle').click(ev => {
      // ev.preventDefault();
      const spell = this.actor.getOwnedItem(ev.currentTarget.id);
      let checkState = ev.currentTarget.checked;
      console.log(spell);
      switch (ev.currentTarget.title) {
        case 'cast':
          spell.update({"data.cast": checkState});
          break;
        case 'library':
          spell.update({"data.library": checkState});
          break;
        case 'spellbook':
          spell.update({"data.spellbook": checkState});
          break;
        case 'memorized':
          spell.update({"data.memorized": checkState});
          break;
        case 'scroll':
          spell.update({"data.scroll": checkState});
          break;
        case 'supplies':
          spell.update({"data.supplies": checkState});
          break;
      }
    });

    // Drop Inventory Item
    html.find('.item-drop').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let tbItem = this.actor.getOwnedItem(li.data("itemId"));
      tbItem.update({
        data: {
          equip: "On Ground",
          carried: "Ground",
          slots: 1,
        }
      }).then(() => {
        setTimeout(() => {
          this.actor._onUpdate({items: true});
        }, 0);
      })
    });

    // Drink Item
    html.find('.item-consume').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let tbItem = this.actor.getOwnedItem(li.data("itemId"));
      tbItem.consumeOne().then(() => {
        setTimeout(() => {
          this.actor._onUpdate({items: true});
        }, 0);
      });
    });

    // Activate Item
    html.find('.item-activate').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let tbItem = this.actor.getOwnedItem(li.data("itemId"));
      tbItem.toggleActive().then(() => {
        setTimeout(() => {
          this.actor._onUpdate({items: true});
        }, 0);
      });
    });

    // Rollable abilities
    html.find('.rollable').click(this._onRoll.bind(this));

    // Event listener for advancing abilities
    html.find('.advanceAbility').click(ev => {
      console.log(ev.currentTarget.innerText);
    });

    // Event listener for advancing skills
    html.find('.advanceSkill').click(ev => {
      let skill = ev.currentTarget.innerText;

      if (this.actor.data.data.skills[skill].rating > 0) {
        
        // If skill can be advanced, do so then clear passes and failures
        if (this.actor.data.data.skills[skill].pass >= this.actor.data.data.skills[skill].rating && this.actor.data.data.skills[skill].fail >= this.actor.data.data.skills[skill].rating - 1) {

          let update = {
            ['data.skills.' + skill + '.rating']: this.actor.data.data.skills[skill].rating + 1,
            ['data.skills.' + skill + '.pass']: 0,
            ['data.skills.' + skill + '.fail']: 0
          };

          this.actor.update(update);
        }
      } else if (this.actor.data.data.skills[skill].rating === 0) {
        if (this.actor.data.data.skills[skill].pass + this.actor.data.data.skills[skill].fail >= this.actor.data.data.nature.max) {
          let update = {
            ['data.skills.' + skill + '.rating']: 2,
            ['data.skills.' + skill + '.pass']: 0,
            ['data.skills.' + skill + '.fail']: 0
          };
          this.actor.update(update);
        }
      }
    });

    html.find('#overburdenToggle').click(() => {
      this.actor.update({
        data: {
          overburdened: !this.actor.tbData().overburdened
        }
      });
    });

    html.find('#primary-tab-inventory').click(() => {
      setTimeout(() => {
        this._tabs[1].activate(this._tabs[1].active, true);
      }, 0);
    });

    // // Event listener for advancing skills
    // html.find('.rollable').click(this._advanceSkill.bind(this));

    // Class changes
    // html.find('#classDropdown').change(ev => {
    //   let className = ev.currentTarget.selectedOptions[0].value;
    //   const classPack = game.packs.get("torchbearer.classes");
    //   let entry;
    //   classPack.getIndex().then(index => classPack.index.find(e => e.name === className)).then(f => {
    //     entry = f;
    //     classPack.getEntity(entry._id).then(cl => {
    //       console.log(cl);
    //       // I can access compendium classes from here.
    //     });
    //   });
    // });

  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    
    const header = event.currentTarget;

    // Get the type of item to create.
    const type = header.dataset.type;
    
    // Grab any data associated with this control.
    const equipSlot = header.type;
    const data = duplicate(header.dataset);
    data.equip = equipSlot;

    // Initialize a default name.
    const name = `New ${type.capitalize()}`;

    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data,
    };

    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    // Determine attribute/skill to roll
    let testedSkillOrAbility = dataset.label;
    this.actor.data.data.lastTest = testedSkillOrAbility;

    // Determine if testedSkillOrAbility is a skill
    let skill = this.isSkill(testedSkillOrAbility);

    // Capitalize first letter for later use in the roll template
    let header = 'Testing: ' + testedSkillOrAbility.charAt(0).toUpperCase() + testedSkillOrAbility.slice(1);

    // Determine if the actor is Fresh
    let freshCheck = "";
    if (this.actor.data.data.fresh === true) {
      freshCheck = "checked";
    }

    // Dialog box for roll customization
    let dialogContent = 'systems/torchbearer/templates/roll-dialog-content.html';
    
    // Build an actor trait list to be passed to the dialog box
    let traits = [];
    const traitList = this.actor.data.data.traits;
    Object.keys(traitList).forEach(key => {
      if (traitList[key].name !== "") {
        traits.push(traitList[key].name);
      }
    });

    // Build a Nature descriptor list to be passed to the dialog box
    let natureDesc = this.actor.data.data.natureDescriptors.split(', ');
    natureDesc.push("Acting outside character's nature");

    renderTemplate(dialogContent, {attribute: header, traitList: traits, fresh: freshCheck, natureDesc: natureDesc, ob: 1, helpDice: 0, supplies: 0, persona: 0}).then(template => {
      new Dialog({
        title: `Test`,
        content: template,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label: `Roll`,
            callback: (html) => {
              let flavorText = html.find('#flavorText').val();
              let helpDice = SafeNum(html.find('#helpingDice').val());
              let ob = SafeNum(html.find('#ob').val()) || 1;
              let trait = {
                name: html.find('#traitDropdown').val(),
                usedFor: !!html.find('#traitFor').prop('checked'),
                usedAgainst: !!html.find('#traitAgainst').prop('checked'),
                usedAgainstExtra: !!html.find('#traitAgainstExtra').prop('checked')
              };
              let tapNature = !!html.find('#natureYes').prop('checked');
              let fresh = !!html.find('#fresh').prop('checked')
              let supplies = SafeNum(html.find('#supplies').val());
              let persona = SafeNum(html.find('#personaAdvantage').val());
              let natureDescriptor = html.find('#natureDesc').val();
              new PlayerRoll(this.actor).roll(
                  testedSkillOrAbility, header, flavorText, helpDice, ob, trait, tapNature,
                  fresh, supplies, persona, natureDescriptor
              );
            }
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: `Cancel`
          }
        },
        default: 'yes'
      }).render(true);
    });
  }

  isSkill(rollTarget) {
    // Create an array of skills for the if check below
    let skills = [];
    const skillList = this.actor.data.data.skills;
    Object.keys(skillList).forEach(key => {
      skills.push(skillList[key].name);
    });

    let skillInfo = {
      "name": "",
      "rating": 0,
      "blAbility": ""
    };

    skills.forEach(key => {
      if (rollTarget === key) {
        skillInfo.name = rollTarget;
        skillInfo.rating = this.actor.data.data.skills[rollTarget].rating;
        skillInfo.blAbility = this.actor.data.data.skills[rollTarget].bl;
      }
    });

    if (skillInfo.name === "") {
      return false;
    } else {
      return skillInfo;
    }
  }

  closestCompatibleContainer(tbItem, target) {
    let $closestContainer = $(target).closest('.inventory-container');
    if(!$closestContainer.length) {
      return {};
    }
    const containerType = $closestContainer.data('containerType');
    const containerId = $closestContainer.data('itemId');
    if(tbItem.isCompatibleContainer(containerType)) {
      return {
        containerType,
        containerId: containerId || '',
        slotsTaken: tbItem.slotsTaken(containerType),
      };
    } else {
      return this.closestCompatibleContainer(tbItem, $closestContainer.parent());
    }
  }

  pickAnotherContainerIfNecessaryDueToItemSize(item) {
    if(!canFit(item, item.data.data.equip, this.actor.data.data.computed.inventory)) {
      if(canFit(item, alternateContainerType(item), this.actor.data.data.computed.inventory)) {
        return alternateContainerType(item);
      }
    }
  }

  /** @override */
  async _onDrop(event) {
    let item = await super._onDrop(event);
    console.log(item);
    if(this.actor.data.type !== 'Character') return;

    let tbItem;
    if(item._id) {
      tbItem = this.actor.items.get(item._id);
    } else {
      tbItem = item;
    }

    if (tbItem.type === "Spell") {
      console.log('Yer a wizard, Harry');
    } else {
      if(tbItem.data) {
        await tbItem.syncEquipVariables();
  
        let oldContainerId = tbItem.data.data.containerId;
        let {containerType, containerId, slotsTaken} = this.closestCompatibleContainer(tbItem, event.target);
        if(!containerType) {
          //No closest container specified, so pick one.
          // First, we know it's not pack w/o a containerId, so if it is the item's gonna need
          // updating.
          if(tbItem.data.data.equip === 'Pack') {
            tbItem.data.data.equip = tbItem.data.data.equipOptions.option1.value;
            tbItem.data.data.slots = tbItem.data.data.slotOptions.option1.value;
            containerType = tbItem.data.data.equip;
            containerId = null;
            slotsTaken = tbItem.data.data.slots;
          }
          let newContainerType = this.pickAnotherContainerIfNecessaryDueToItemSize(tbItem);
          if(newContainerType) {
            slotsTaken = tbItem.slotsTaken(newContainerType);
            containerType = newContainerType;
          }
        }
        if(containerType) {
          let update = {data: {equip: containerType, containerId: containerId, slots: slotsTaken}};
          await tbItem.update(update);
          await tbItem.onAfterEquipped({containerType, containerId});
          this.actor._onUpdate({items: true});
          if(oldContainerId) {
            let oldContainer = this.actor.items.get(oldContainerId);
            setTimeout(() => {
              oldContainer.sheet.render(false);
            }, 0)
          }
          if(containerId) {
            let newContainer = this.actor.items.get(containerId);
            setTimeout(() => {
              newContainer.sheet.render(false);
            }, 0)
          }
        }
      }
    }

    return tbItem;
  }

  /** @override */
  _onSortItem(event, itemData) {
    super._onSortItem(event, itemData);
    let item = this.actor.items.get(itemData._id);
    return item.data;
  }
}
