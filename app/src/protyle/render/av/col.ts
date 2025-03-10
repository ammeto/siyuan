import {hasClosestBlock} from "../../util/hasClosest";
import {Menu} from "../../../plugin/Menu";
import {transaction} from "../../wysiwyg/transaction";
import {fetchPost} from "../../../util/fetch";
import {getDefaultOperatorByType, setFilter} from "./filter";
import {genCellValue} from "./cell";
import {openMenuPanel} from "./openMenuPanel";
import {getLabelByNumberFormat} from "./number";
import {addAttrViewColAnimation, removeAttrViewColAnimation} from "./action";

export const duplicateCol = (options: {
    protyle: IProtyle,
    type: TAVCol,
    avID: string,
    colId: string,
    newValue: string
}) => {
    const id = Lute.NewNodeID();
    const nameMatch = options.newValue.match(/^(.*) \((\d+)\)$/);
    if (nameMatch) {
        options.newValue = `${nameMatch[1]} (${parseInt(nameMatch[2]) + 1})`;
    } else {
        options.newValue = `${options.newValue} (1)`;
    }
    if (["select", "mSelect"].includes(options.type)) {
        fetchPost("/api/av/renderAttributeView", {id: options.avID}, (response) => {
            const data = response.data as IAV;
            let colOptions;
            data.view.columns.find((item) => {
                if (item.id === options.colId) {
                    colOptions = item.options;
                    return true;
                }
            });
            transaction(options.protyle, [{
                action: "addAttrViewCol",
                name: options.newValue,
                avID: options.avID,
                type: options.type,
                id
            }, {
                action: "sortAttrViewCol",
                avID: options.avID,
                previousID: options.colId,
                id
            }, {
                action: "updateAttrViewColOptions",
                id,
                avID: options.avID,
                data: colOptions
            }], [{
                action: "removeAttrViewCol",
                id,
                avID: options.avID,
            }]);
        });
    } else {
        transaction(options.protyle, [{
            action: "addAttrViewCol",
            name: options.newValue,
            avID: options.avID,
            type: options.type,
            id
        }, {
            action: "sortAttrViewCol",
            avID: options.avID,
            previousID: options.colId,
            id
        }], [{
            action: "removeAttrViewCol",
            id,
            avID: options.avID,
        }]);
    }
    addAttrViewColAnimation({
        blockElement: options.protyle.wysiwyg.element.querySelector(`[data-av-id="${options.avID}"]`),
        protyle: options.protyle,
        type: options.type,
        name: options.newValue,
        previousId: options.colId,
        id
    });
};

export const getEditHTML = (options: {
    protyle: IProtyle,
    colId: string,
    data: IAV
}) => {
    let colData: IAVColumn;
    options.data.view.columns.find((item) => {
        if (item.id === options.colId) {
            colData = item;
            return true;
        }
    });
    let html = `<button class="b3-menu__item" data-type="nobg" data-col-id="${options.colId}">
    <span class="block__icon" style="padding: 8px;margin-left: -4px;" data-type="goProperties">
        <svg><use xlink:href="#iconLeft"></use></svg>
    </span>
    <span class="b3-menu__label ft__center">${window.siyuan.languages.edit}</span>
    <svg class="b3-menu__action" data-type="close" style="opacity: 1"><use xlink:href="#iconCloseRound"></use></svg>
</button>
<button class="b3-menu__separator"></button>
<button class="b3-menu__item">
    <svg class="b3-menu__icon"><use xlink:href="#${getColIconByType(colData.type)}"></use></svg>
    <span class="b3-menu__label"><input data-type="name" style="margin: 4px 0" class="b3-text-field" type="text" value="${colData.name}"></span>
</button>`;
    if (colData.options && colData.options.length > 0) {
        html += `<button class="b3-menu__separator"></button>
<button class="b3-menu__item">
    <svg class="b3-menu__icon" style=""><use xlink:href="#iconAdd"></use></svg>
    <span class="b3-menu__label"><input data-type="addOption"  style="margin: 4px 0" class="b3-text-field" type="text" placeholder="Enter ${window.siyuan.languages.addAttr}"></span>
</button>`;
        colData.options.forEach(item => {
            html += `<button class="b3-menu__item${html ? "" : " b3-menu__item--current"}" draggable="true" data-name="${item.name}" data-color="${item.color}">
    <svg class="b3-menu__icon"><use xlink:href="#iconDrag"></use></svg>
    <div class="fn__flex-1">
        <span class="b3-chip" style="background-color:var(--b3-font-background${item.color});color:var(--b3-font-color${item.color})">
            <span class="fn__ellipsis">${item.name}</span>
        </span>
    </div>
    <svg class="b3-menu__action" data-type="setColOption"><use xlink:href="#iconEdit"></use></svg>
</button>`;
        });
    }
    if (colData.type === "number") {
        html += `<button class="b3-menu__separator"></button>
<button class="b3-menu__item" data-type="numberFormat" data-format="${colData.numberFormat}">
    <svg class="b3-menu__icon"><use xlink:href="#iconFormat"></use></svg>
    <span class="b3-menu__label">${window.siyuan.languages.format}</span>
    <span class="b3-menu__accelerator">${getLabelByNumberFormat(colData.numberFormat)}</span>
</button>`;
    }
    return `<div class="b3-menu__items">
${html}
<button class="b3-menu__separator"></button>
<button class="b3-menu__item" data-type="${colData.hidden ? "showCol" : "hideCol"}">
    <svg class="b3-menu__icon" style=""><use xlink:href="#icon${colData.hidden ? "Eye" : "Eyeoff"}"></use></svg>
    <span class="b3-menu__label">${colData.hidden ? window.siyuan.languages.showCol : window.siyuan.languages.hideCol}</span>
</button>
<button class="b3-menu__item" data-type="duplicateCol">
    <svg class="b3-menu__icon" style=""><use xlink:href="#iconCopy"></use></svg>
    <span class="b3-menu__label">${window.siyuan.languages.duplicate}</span>
</button>
<button class="b3-menu__item" data-type="removeCol">
    <svg class="b3-menu__icon" style=""><use xlink:href="#iconTrashcan"></use></svg>
    <span class="b3-menu__label">${window.siyuan.languages.delete}</span>
</button>
</div>`;
};

export const bindEditEvent = (options: { protyle: IProtyle, data: IAV, menuElement: HTMLElement }) => {
    const avID = options.data.id;
    const colId = options.menuElement.querySelector(".b3-menu__item").getAttribute("data-col-id");
    const colData = options.data.view.columns.find((item: IAVColumn) => item.id === colId);
    const nameElement = options.menuElement.querySelector('[data-type="name"]') as HTMLInputElement;
    nameElement.addEventListener("blur", () => {
        const newValue = nameElement.value;
        if (newValue === colData.name) {
            return;
        }
        transaction(options.protyle, [{
            action: "updateAttrViewCol",
            id: colId,
            avID,
            name: newValue,
            type: colData.type,
        }], [{
            action: "updateAttrViewCol",
            id: colId,
            avID,
            name: colData.name,
            type: colData.type,
        }]);
        colData.name = newValue;
    });
    nameElement.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.isComposing) {
            return;
        }
        if (event.key === "Escape") {
            options.menuElement.parentElement.remove();
        } else if (event.key === "Enter") {
            nameElement.dispatchEvent(new CustomEvent("blur"));
            options.menuElement.parentElement.remove();
        }
    });
    const addOptionElement = options.menuElement.querySelector('[data-type="addOption"]') as HTMLInputElement;
    if (!addOptionElement) {
        return;
    }
    addOptionElement.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.isComposing) {
            return;
        }
        if (event.key === "Escape") {
            options.menuElement.parentElement.remove();
        }
        if (event.key === "Enter") {
            let hasSelected = false;
            colData.options.find((item) => {
                if (addOptionElement.value === item.name) {
                    hasSelected = true;
                    return true;
                }
            });
            if (hasSelected) {
                return;
            }
            colData.options.push({
                color: (colData.options.length + 1).toString(),
                name: addOptionElement.value
            });
            transaction(options.protyle, [{
                action: "updateAttrViewColOptions",
                id: colId,
                avID,
                data: colData.options
            }], [{
                action: "removeAttrViewColOption",
                id: colId,
                avID,
                data: addOptionElement.value
            }]);
            options.menuElement.innerHTML = getEditHTML({protyle: options.protyle, colId, data: options.data});
            bindEditEvent({protyle: options.protyle, menuElement: options.menuElement, data: options.data});
            (options.menuElement.querySelector('[data-type="addOption"]') as HTMLInputElement).focus();
        }
    });
};

export const getColIconByType = (type: TAVCol) => {
    switch (type) {
        case "text":
            return "iconAlignLeft";
        case "block":
            return "iconParagraph";
        case "number":
            return "iconNumber";
        case "select":
            return "iconListItem";
        case "mSelect":
            return "iconList";
        case "date":
            return "iconCalendar";
        case "url":
            return "iconLink";
        case "mAsset":
            return "iconImage";
        case "email":
            return "iconEmail";
        case "phone":
            return "iconPhone";
    }
};

export const updateHeader = (rowElement: HTMLElement) => {
    const blockElement = hasClosestBlock(rowElement);
    if (!blockElement) {
        return;
    }
    const selectCount = rowElement.parentElement.querySelectorAll(".av__row--select:not(.av__row--header)").length;
    const diffCount = rowElement.parentElement.childElementCount - 3 - selectCount;
    const headElement = rowElement.parentElement.firstElementChild;
    const headUseElement = headElement.querySelector("use");
    const counterElement = blockElement.querySelector(".av__counter");
    const avHeadElement = blockElement.querySelector(".av__header") as HTMLElement;
    if (diffCount === 0 && rowElement.parentElement.childElementCount - 3 !== 0) {
        headElement.classList.add("av__row--select");
        headUseElement.setAttribute("xlink:href", "#iconCheck");
    } else if (diffCount === rowElement.parentElement.childElementCount - 3) {
        headElement.classList.remove("av__row--select");
        headUseElement.setAttribute("xlink:href", "#iconUncheck");
        counterElement.classList.add("fn__none");
        avHeadElement.style.position = "";
        return;
    } else if (diffCount > 0) {
        headElement.classList.add("av__row--select");
        headUseElement.setAttribute("xlink:href", "#iconIndeterminateCheck");
    }
    counterElement.classList.remove("fn__none");
    counterElement.innerHTML = `${selectCount} selected`;
    avHeadElement.style.position = "sticky";
};

export const showColMenu = (protyle: IProtyle, blockElement: Element, cellElement: HTMLElement) => {
    const type = cellElement.getAttribute("data-dtype") as TAVCol;
    const colId = cellElement.getAttribute("data-col-id");
    const avID = blockElement.getAttribute("data-av-id");
    const menu = new Menu("av-header-cell", () => {
        const newValue = (window.siyuan.menus.menu.element.querySelector(".b3-text-field") as HTMLInputElement).value;
        if (newValue === cellElement.textContent.trim()) {
            return;
        }
        transaction(protyle, [{
            action: "updateAttrViewCol",
            id: colId,
            avID,
            name: newValue,
            type,
        }], [{
            action: "updateAttrViewCol",
            id: colId,
            avID,
            name: cellElement.textContent.trim(),
            type,
        }]);
    });
    menu.addItem({
        icon: getColIconByType(type),
        label: `<input style="margin: 4px 0" class="b3-text-field" type="text" value="${cellElement.innerText.trim()}">`,
        bind(element) {
            element.querySelector("input").addEventListener("keydown", (event: KeyboardEvent) => {
                if (event.isComposing) {
                    return;
                }
                if (event.key === "Enter") {
                    menu.close();
                }
            });
        }
    });
    if (type !== "block") {
        menu.addItem({
            icon: "iconEdit",
            label: window.siyuan.languages.edit,
            click() {
                openMenuPanel({protyle, blockElement, type: "edit", colId});
            }
        });
    }
    menu.addSeparator();
    menu.addItem({
        icon: "iconUp",
        label: window.siyuan.languages.asc,
        click() {
            fetchPost("/api/av/renderAttributeView", {
                id: avID,
            }, (response) => {
                transaction(protyle, [{
                    action: "setAttrViewSorts",
                    avID: response.data.id,
                    data: [{
                        column: colId,
                        order: "ASC"
                    }]
                }], [{
                    action: "setAttrViewSorts",
                    avID: response.data.id,
                    data: response.data.view.sorts
                }]);
            });
        }
    });
    menu.addItem({
        icon: "iconDown",
        label: window.siyuan.languages.desc,
        click() {
            fetchPost("/api/av/renderAttributeView", {
                id: avID,
            }, (response) => {
                transaction(protyle, [{
                    action: "setAttrViewSorts",
                    avID: response.data.id,
                    data: [{
                        column: colId,
                        order: "DESC"
                    }]
                }], [{
                    action: "setAttrViewSorts",
                    avID: response.data.id,
                    data: response.data.view.sorts
                }]);
            });
        }
    });
    if (type !== "mAsset") {
        menu.addItem({
            icon: "iconFilter",
            label: window.siyuan.languages.filter,
            click() {
                fetchPost("/api/av/renderAttributeView", {
                    id: avID,
                }, (response) => {
                    const avData = response.data as IAV;
                    let filter: IAVFilter;
                    avData.view.filters.find((item) => {
                        if (item.column === colId) {
                            filter = item;
                            return true;
                        }
                    });
                    if (!filter) {
                        filter = {
                            column: colId,
                            operator: getDefaultOperatorByType(type),
                            value: genCellValue(type, "")
                        };
                        avData.view.filters.push(filter);
                        transaction(protyle, [{
                            action: "setAttrViewFilters",
                            avID,
                            data: [filter]
                        }], [{
                            action: "setAttrViewFilters",
                            avID,
                            data: []
                        }]);
                    }
                    setFilter({
                        filter,
                        protyle,
                        data: avData,
                        target: blockElement.querySelector(`.av__row--header .av__cell[data-col-id="${colId}"]`),
                    });
                });
            }
        });
    }
    menu.addSeparator();
    if (type !== "block") {
        menu.addItem({
            icon: "iconEyeoff",
            label: window.siyuan.languages.hide,
            click() {
                transaction(protyle, [{
                    action: "setAttrViewColHidden",
                    id: colId,
                    avID,
                    data: true
                }], [{
                    action: "setAttrViewColHidden",
                    id: colId,
                    avID,
                    data: false
                }]);
            }
        });
        menu.addItem({
            icon: "iconCopy",
            label: window.siyuan.languages.duplicate,
            click() {
                duplicateCol({
                    protyle,
                    type,
                    avID,
                    colId,
                    newValue: (window.siyuan.menus.menu.element.querySelector(".b3-text-field") as HTMLInputElement).value
                });
            }
        });
        menu.addItem({
            icon: "iconTrashcan",
            label: window.siyuan.languages.delete,
            click() {
                transaction(protyle, [{
                    action: "removeAttrViewCol",
                    id: colId,
                    avID,
                }], [{
                    action: "addAttrViewCol",
                    name: cellElement.textContent.trim(),
                    avID,
                    type: type,
                    id: colId
                }]);
                removeAttrViewColAnimation(blockElement, colId);
            }
        });
        menu.addSeparator();
    }
    menu.addItem({
        label: `<div class="fn__flex" style="margin: 4px 0"><span>${window.siyuan.languages.wrap}</span><span class="fn__space fn__flex-1"></span>
<input type="checkbox" class="b3-switch fn__flex-center"${cellElement.style.whiteSpace === "nowrap" ? "" : " checked"}></div>`,
        bind(element) {
            const inputElement = element.querySelector("input") as HTMLInputElement;
            inputElement.addEventListener("change", () => {
                transaction(protyle, [{
                    action: "setAttrViewColWrap",
                    id: colId,
                    avID,
                    data: inputElement.checked
                }], [{
                    action: "setAttrViewColWrap",
                    id: colId,
                    avID,
                    data: !inputElement.checked
                }]);
            });
        }
    });
    const cellRect = cellElement.getBoundingClientRect();
    menu.open({
        x: cellRect.left,
        y: cellRect.bottom,
        h: cellRect.height
    });
    const inputElement = window.siyuan.menus.menu.element.querySelector(".b3-text-field") as HTMLInputElement;
    if (inputElement) {
        inputElement.select();
        inputElement.focus();
    }
};
