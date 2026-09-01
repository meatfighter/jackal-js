import {
    SCALING_MODE_DEFINITIONS,
    getScalingDefinition,
    isScalingPreference,
    type JackalScalingPreference,
    type ScalingModeDefinition
} from "./AppPreferences.js";
import { escapeHtml } from "./JackalScreens.js";

const PICKER_BREATHING_ROOM_PX = 10;

export function scalingPickerHtml(preference: JackalScalingPreference): string {
    const selectedDefinition = getScalingDefinition(preference);
    return `
        <div id="scaling-picker" class="theme-picker scaling-picker" data-open="false">
            <button id="scaling-button" class="theme-picker-button scaling-picker-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="scaling-list">
                <span class="theme-picker-label scaling-picker-label">${escapeHtml(selectedDefinition.label)}</span>
                <span class="picker-caret" aria-hidden="true"></span>
            </button>
            <div id="scaling-popup" class="theme-picker-popup scaling-picker-popup" hidden>
                <div id="scaling-list" class="theme-picker-list scaling-picker-list" role="listbox" aria-label="Scaling">
                    ${SCALING_MODE_DEFINITIONS.map((definition) => scalingOptionHtml(definition, preference)).join("")}
                </div>
            </div>
        </div>`;
}

export function bindScalingPicker(
    menu: HTMLElement,
    getPreference: () => JackalScalingPreference,
    setPreference: (value: JackalScalingPreference) => void
): void {
    const picker = menu.querySelector<HTMLElement>("#scaling-picker");
    const button = menu.querySelector<HTMLButtonElement>("#scaling-button");
    const popup = menu.querySelector<HTMLElement>("#scaling-popup");
    const list = menu.querySelector<HTMLElement>("#scaling-list");
    if (picker === null || button === null || popup === null || list === null) {
        return;
    }

    const options = Array.from(menu.querySelectorAll<HTMLButtonElement>("[data-scaling-mode]"));
    measureScalingPickerWidth(picker, button, popup, list);
    updateScalingUi(picker, getPreference());

    const change = (value: string): void => {
        if (isScalingPreference(value)) {
            setPreference(value);
        }
        updateScalingUi(picker, getPreference());
        setPickerOpen(picker, button, popup, false);
        button.focus();
    };

    button.addEventListener("click", () => setPickerOpen(picker, button, popup, !isPickerOpen(picker), true));
    button.addEventListener("keydown", (event) => {
        if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setPickerOpen(picker, button, popup, true, true);
        }
    });
    list.addEventListener("keydown", (event) => {
        const currentIndex = Math.max(
            0,
            options.findIndex((option) => option === document.activeElement)
        );
        if (event.key === "Escape") {
            event.preventDefault();
            setPickerOpen(picker, button, popup, false);
            button.focus();
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            options[(currentIndex + 1) % options.length]?.focus();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            options[(currentIndex + options.length - 1) % options.length]?.focus();
        } else if (event.key === "Home") {
            event.preventDefault();
            options[0]?.focus();
        } else if (event.key === "End") {
            event.preventDefault();
            options[options.length - 1]?.focus();
        } else if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            const target = document.activeElement;
            if (target instanceof HTMLElement) {
                change(target.dataset.scalingMode ?? "");
            }
        }
    });
    for (const option of options) {
        option.addEventListener("click", () => change(option.dataset.scalingMode ?? ""));
    }
    menu.addEventListener("click", (event) => {
        if (event.target instanceof Node && !picker.contains(event.target)) {
            setPickerOpen(picker, button, popup, false);
        }
    });
    picker.addEventListener("focusout", () => {
        window.setTimeout(() => {
            if (!picker.contains(document.activeElement)) {
                setPickerOpen(picker, button, popup, false);
            }
        }, 0);
    });
}

function scalingOptionHtml(definition: ScalingModeDefinition, preference: JackalScalingPreference): string {
    return `
        <button class="theme-picker-option scaling-picker-option" type="button" role="option" aria-selected="${definition.value === preference}" data-scaling-mode="${definition.value}">
            <span>${escapeHtml(definition.label)}</span>
            <span class="picker-caret-placeholder" aria-hidden="true"></span>
        </button>`;
}

function updateScalingUi(picker: HTMLElement, preference: JackalScalingPreference): void {
    const selectedDefinition = getScalingDefinition(preference);
    const label = picker.querySelector<HTMLElement>(".scaling-picker-label");
    if (label !== null) {
        label.textContent = selectedDefinition.label;
    }
    for (const option of picker.querySelectorAll<HTMLElement>("[data-scaling-mode]")) {
        option.setAttribute("aria-selected", String(option.dataset.scalingMode === preference));
    }
}

function measureScalingPickerWidth(picker: HTMLElement, button: HTMLButtonElement, popup: HTMLElement, list: HTMLElement): void {
    const wasPopupHidden = popup.hidden;
    popup.hidden = false;
    const buttonStyle = window.getComputedStyle(button);
    const option = list.querySelector<HTMLElement>(".theme-picker-option");
    const optionStyle = option === null ? null : window.getComputedStyle(option);
    const popupStyle = window.getComputedStyle(popup);
    const listStyle = window.getComputedStyle(list);
    const buttonAccessoryWidth = getElementsOuterWidth(button, [".picker-caret"]);
    const optionAccessoryWidth = option === null ? 0 : getElementsOuterWidth(option, [".picker-caret-placeholder"]);
    const maxLabelWidth = measureWidestPickerLabel(
        picker,
        optionStyle ?? buttonStyle,
        SCALING_MODE_DEFINITIONS.map((definition) => definition.label)
    );
    const scrollbarWidth = getElementVerticalScrollbarWidth(list, listStyle);
    const buttonWidth = maxLabelWidth + parseCssPixels(buttonStyle.columnGap) + buttonAccessoryWidth + horizontalSpacing(buttonStyle, true) + 4;
    const optionWidth =
        optionStyle === null
            ? 0
            : maxLabelWidth +
              parseCssPixels(optionStyle.columnGap) +
              optionAccessoryWidth +
              horizontalSpacing(optionStyle, false) +
              horizontalSpacing(popupStyle, true) +
              horizontalSpacing(listStyle, true) +
              scrollbarWidth +
              4;
    picker.style.setProperty("--theme-picker-width", `${Math.ceil(Math.max(buttonWidth, optionWidth) + PICKER_BREATHING_ROOM_PX)}px`);
    popup.hidden = wasPopupHidden;
}

function measureWidestPickerLabel(parent: HTMLElement, style: CSSStyleDeclaration, labels: readonly string[]): number {
    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.left = "-10000px";
    probe.style.top = "0";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "nowrap";
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontSize = style.fontSize;
    probe.style.fontWeight = style.fontWeight;
    probe.style.fontStyle = style.fontStyle;
    probe.style.letterSpacing = style.letterSpacing;
    parent.appendChild(probe);
    let maxLabelWidth = 0;
    for (const label of labels) {
        probe.textContent = label;
        maxLabelWidth = Math.max(maxLabelWidth, probe.getBoundingClientRect().width);
    }
    probe.remove();
    return maxLabelWidth;
}

function getElementsOuterWidth(parent: HTMLElement, selectors: readonly string[]): number {
    let width = 0;
    for (const selector of selectors) {
        width += parent.querySelector<HTMLElement>(selector)?.getBoundingClientRect().width ?? 0;
    }
    return width;
}

function getElementVerticalScrollbarWidth(element: HTMLElement, style: CSSStyleDeclaration): number {
    const borderWidth = parseCssPixels(style.borderLeftWidth) + parseCssPixels(style.borderRightWidth);
    return Math.max(0, element.offsetWidth - element.clientWidth - borderWidth);
}

function horizontalSpacing(style: CSSStyleDeclaration, includeBorder: boolean): number {
    const borderWidth = includeBorder ? parseCssPixels(style.borderLeftWidth) + parseCssPixels(style.borderRightWidth) : 0;
    return parseCssPixels(style.paddingLeft) + parseCssPixels(style.paddingRight) + borderWidth;
}

function parseCssPixels(value: string): number {
    const pixels = Number.parseFloat(value);
    return Number.isFinite(pixels) ? pixels : 0;
}

function isPickerOpen(picker: HTMLElement): boolean {
    return picker.dataset.open === "true";
}

function setPickerOpen(picker: HTMLElement, button: HTMLButtonElement, popup: HTMLElement, open: boolean, focusSelected = false): void {
    picker.dataset.open = String(open);
    button.setAttribute("aria-expanded", String(open));
    popup.hidden = !open;
    if (!open || !focusSelected) {
        return;
    }
    const list = popup.querySelector<HTMLElement>("#scaling-list");
    const selected = list?.querySelector<HTMLElement>("[data-scaling-mode][aria-selected='true']") ?? list?.querySelector<HTMLElement>("[data-scaling-mode]");
    selected?.focus();
}
