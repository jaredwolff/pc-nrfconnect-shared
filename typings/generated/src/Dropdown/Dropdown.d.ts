import React from 'react';
export interface DropdownItem {
    label: React.ReactNode;
    value: string;
}
export interface DropdownProps {
    id?: string;
    label?: string;
    items: DropdownItem[];
    onSelect: (item: DropdownItem) => void;
    disabled?: boolean;
    selectedItem: DropdownItem;
    numItemsBeforeScroll?: number;
}
export declare const X: () => JSX.Element;
declare const Dropdown: ({ id, label, items, onSelect, disabled, selectedItem, numItemsBeforeScroll, }: DropdownProps) => JSX.Element;
export default Dropdown;
