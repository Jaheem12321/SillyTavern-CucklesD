import { callPopup } from '../../../../../script.js';
import { getSortableDelay } from '../../../../utils.js';
import { warn } from '../../index.js';
import { QuickReplySet } from '../QuickReplySet.js';
// eslint-disable-next-line no-unused-vars
import { QuickReplySettings } from '../QuickReplySettings.js';

export class SettingsUi {
    /**@type {QuickReplySettings}*/ settings;

    /**@type {HTMLElement}*/ template;
    /**@type {HTMLElement}*/ dom;

    /**@type {HTMLInputElement}*/ isEnabled;
    /**@type {HTMLInputElement}*/ isCombined;

    /**@type {HTMLElement}*/ globalSetList;

    /**@type {HTMLElement}*/ chatSetList;

    /**@type {QuickReplySet}*/ currentQrSet;
    /**@type {HTMLInputElement}*/ disableSend;
    /**@type {HTMLInputElement}*/ placeBeforeInput;
    /**@type {HTMLInputElement}*/ injectInput;
    /**@type {HTMLSelectElement}*/ currentSet;




    constructor(/**@type {QuickReplySettings}*/settings) {
        this.settings = settings;
        settings.onRequestEditSet = (qrs) => this.selectQrSet(qrs);
    }






    rerender() {
        if (!this.dom) return;
        const content = this.dom.querySelector('.inline-drawer-content');
        content.innerHTML = '';
        // @ts-ignore
        Array.from(this.template.querySelector('.inline-drawer-content').cloneNode(true).children).forEach(el=>{
            content.append(el);
        });
        this.prepareDom();
    }
    unrender() {
        this.dom?.remove();
        this.dom = null;
    }
    async render() {
        if (!this.dom) {
            const response = await fetch('/scripts/extensions/quick-reply/html/settings.html', { cache: 'no-store' });
            if (response.ok) {
                this.template = document.createRange().createContextualFragment(await response.text()).querySelector('#qr--settings');
                // @ts-ignore
                this.dom = this.template.cloneNode(true);
                this.prepareDom();
            } else {
                warn('failed to fetch settings template');
            }
        }
        return this.dom;
    }


    prepareGeneralSettings() {
        // general settings
        this.isEnabled = this.dom.querySelector('#qr--isEnabled');
        this.isEnabled.checked = this.settings.isEnabled;
        this.isEnabled.addEventListener('click', ()=>this.onIsEnabled());

        this.isCombined = this.dom.querySelector('#qr--isCombined');
        this.isCombined.checked = this.settings.isCombined;
        this.isCombined.addEventListener('click', ()=>this.onIsCombined());
    }

    prepareGlobalSetList() {
        this.settings.config.renderSettingsInto(this.dom.querySelector('#qr--global'));
    }
    prepareChatSetList() {
        if (this.settings.chatConfig) {
            this.settings.chatConfig.renderSettingsInto(this.dom.querySelector('#qr--chat'));
        } else {
            const info = document.createElement('div'); {
                info.textContent = 'No active chat.';
            }
            this.dom.querySelector('#qr--chat').append(info);
        }
    }

    prepareQrEditor() {
        // qr editor
        this.dom.querySelector('#qr--set-delete').addEventListener('click', async()=>this.deleteQrSet());
        this.dom.querySelector('#qr--set-new').addEventListener('click', async()=>this.addQrSet());
        this.dom.querySelector('#qr--set-add').addEventListener('click', async()=>{
            this.currentQrSet.addQuickReply();
        });
        this.qrList = this.dom.querySelector('#qr--set-qrList');
        this.currentSet = this.dom.querySelector('#qr--set');
        this.currentSet.addEventListener('change', ()=>this.onQrSetChange());
        QuickReplySet.list.forEach(qrs=>{
            const opt = document.createElement('option'); {
                opt.value = qrs.name;
                opt.textContent = qrs.name;
                this.currentSet.append(opt);
            }
        });
        this.disableSend = this.dom.querySelector('#qr--disableSend');
        this.disableSend.addEventListener('click', ()=>{
            const qrs = this.currentQrSet;
            qrs.disableSend = this.disableSend.checked;
            qrs.save();
        });
        this.placeBeforeInput = this.dom.querySelector('#qr--placeBeforeInput');
        this.placeBeforeInput.addEventListener('click', ()=>{
            const qrs = this.currentQrSet;
            qrs.placeBeforeInput = this.placeBeforeInput.checked;
            qrs.save();
        });
        this.injectInput = this.dom.querySelector('#qr--injectInput');
        this.injectInput.addEventListener('click', ()=>{
            const qrs = this.currentQrSet;
            qrs.injectInput = this.injectInput.checked;
            qrs.save();
        });
        this.onQrSetChange();
    }
    onQrSetChange() {
        this.currentQrSet = QuickReplySet.get(this.currentSet.value);
        this.disableSend.checked = this.currentQrSet.disableSend;
        this.placeBeforeInput.checked = this.currentQrSet.placeBeforeInput;
        this.injectInput.checked = this.currentQrSet.injectInput;
        this.qrList.innerHTML = '';
        const qrsDom = this.currentQrSet.renderSettings();
        this.qrList.append(qrsDom);
        // @ts-ignore
        $(qrsDom).sortable({
            delay: getSortableDelay(),
            stop: ()=>this.onQrListSort(),
        });
    }


    prepareDom() {
        this.prepareGeneralSettings();
        this.prepareGlobalSetList();
        this.prepareChatSetList();
        this.prepareQrEditor();
    }




    async onIsEnabled() {
        this.settings.isEnabled = this.isEnabled.checked;
        this.settings.save();
    }

    async onIsCombined() {
        this.settings.isCombined = this.isCombined.checked;
        this.settings.save();
    }

    async onGlobalSetListSort() {
        this.settings.config.setList = Array.from(this.globalSetList.children).map((it,idx)=>{
            const set = this.settings.config.setList[Number(it.getAttribute('data-order'))];
            it.setAttribute('data-order', String(idx));
            return set;
        });
        this.settings.save();
    }

    async onChatSetListSort() {
        this.settings.chatConfig.setList = Array.from(this.chatSetList.children).map((it,idx)=>{
            const set = this.settings.chatConfig.setList[Number(it.getAttribute('data-order'))];
            it.setAttribute('data-order', String(idx));
            return set;
        });
        this.settings.save();
    }

    updateOrder(list) {
        Array.from(list.children).forEach((it,idx)=>{
            it.setAttribute('data-order', idx);
        });
    }

    async onQrListSort() {
        this.currentQrSet.qrList = Array.from(this.qrList.querySelectorAll('.qr--set-item')).map((it,idx)=>{
            const qr = this.currentQrSet.qrList.find(qr=>qr.id == Number(it.getAttribute('data-id')));
            it.setAttribute('data-order', String(idx));
            return qr;
        });
        this.currentQrSet.save();
    }

    async deleteQrSet() {
        const confirmed = await callPopup(`Are you sure you want to delete the Quick Reply Set "${this.currentQrSet.name}"? This cannot be undone.`, 'confirm');
        if (confirmed) {
            const idx = QuickReplySet.list.indexOf(this.currentQrSet);
            await this.currentQrSet.delete();
            this.currentSet.children[idx].remove();
            [
                ...Array.from(this.globalSetList.querySelectorAll('.qr--item > .qr--set')),
                ...Array.from(this.chatSetList.querySelectorAll('.qr--item > .qr--set')),
            ]
                // @ts-ignore
                .filter(it=>it.value == this.currentQrSet.name)
                // @ts-ignore
                .forEach(it=>it.closest('.qr--item').querySelector('.qr--del').click())
            ;
            this.onQrSetChange();
        }
    }

    async addQrSet() {
        const name = await callPopup('Quick Reply Set Name:', 'input');
        if (name && name.length > 0) {
            const oldQrs = QuickReplySet.get(name);
            if (oldQrs) {
                const replace = await callPopup(`A Quick Reply Set named "${name}" already exists.\nDo you want to overwrite the existing Quick Reply Set?\nThe existing set will be deleted. This cannot be undone.`, 'confirm');
                if (replace) {
                    const qrs = new QuickReplySet();
                    qrs.name = name;
                    qrs.addQuickReply();
                    QuickReplySet.list[QuickReplySet.list.indexOf(oldQrs)] = qrs;
                    this.currentSet.value = name;
                    this.onQrSetChange();
                }
            } else {
                const qrs = new QuickReplySet();
                qrs.name = name;
                qrs.addQuickReply();
                const idx = QuickReplySet.list.findIndex(it=>it.name.localeCompare(name) == 1);
                QuickReplySet.list.splice(idx, 0, qrs);
                const opt = document.createElement('option'); {
                    opt.value = qrs.name;
                    opt.textContent = qrs.name;
                    this.currentSet.children[idx].insertAdjacentElement('beforebegin', opt);
                }
                this.currentSet.value = name;
                this.onQrSetChange();
            }
        }
    }

    selectQrSet(qrs) {
        this.currentSet.value = qrs.name;
        this.onQrSetChange();
    }
}
