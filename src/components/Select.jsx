import { useState, useRef } from 'react';
import {
    Button,
    Dialog,
    DialogTrigger,
    Group,
    Popover,
    ListBox,
    ListBoxItem,    
} from 'react-aria-components';
import './Select.css';

/** @type {(key: string | number, items: SelectItem[]) => SelectItem} */
function getKey(key, items) {
    return items.find((item) => item.id === key);
}

/** @typedef {string | number} Id */
/** @typedef {{ id: Id, display?: any, text: string }} SelectItem */

/**
 * @typedef {Object} SelectProps
 * @property { SelectItem[]} items
 * @property {(selected: SelectItem[] | SelectItem) => void} [onChange]
 * @property {boolean} [disabled]
 * @property {Id | Id[]} [disabledKeys]
 * @property {Id | Id[]} [selection]
 * @property {"single" | "multiple"} [selectionMode]
 * @property {boolean} [inlineClear]
 */

/** @param {SelectProps} props */
export default function Select({ 
    items,
    onChange = () => {},
    disabled = false,
    disabledKeys,
    selection,
    selectionMode = "single",
    inlineClear = false
}) {
    let initalSelectedKeys = 
        Array.isArray(selection) ? 
        selection : 
        (selection ? [selection] : [])
    /** @type [Set, (any) => void] */
    let [selectedKeys, setSelectedKeys] = 
        useState(new Set(initalSelectedKeys));
    let triggerElement = useRef(null);
    
    return <div className={disabled ? "react-aria-Select react-aria-Select__disabled" : "react-aria-Select"}>
        <Group ref={triggerElement}>
            {disabled ? 
                <DialogTrigger isOpen={false}>
                    <Button className="react-aria-Select__current-values">
                        {/* current selected values */}
                        {([...selectedKeys]).map((key, index) => {
                            let item = getKey(key, items);
                            if (index + 1 < selectedKeys.size) {
                                return <span key={key}>{item.display ?? item.text}, </span>;
                            } else {
                                return <span key={key}>{item.display ?? item.text}</span>;
                            }
                        })}
                    </Button>
                    <Button className="react-aria-Select-trigger">▼</Button>
                </DialogTrigger>
                : <DialogTrigger>
                    <Button className="react-aria-Select__current-values">
                        {/* current selected values */}
                        {([...selectedKeys]).map((key, index) => {
                            let item = getKey(key, items);
                            if (index + 1 < selectedKeys.size) {
                                return <span key={key}>{item.display ?? item.text}, </span>;
                            } else {
                                return <span key={key}>{item.display ?? item.text}</span>;
                            }
                        })}
                    </Button>
                    <Button className="react-aria-Select-trigger">▼</Button>
                    <Popover triggerRef={triggerElement} placement="bottom left">
                        <Dialog>
                            <ListBox
                                items={items}
                                selectionMode={selectionMode}
                                disabledKeys={disabledKeys}
                                selectedKeys={selectedKeys}
                                onSelectionChange={(selection) => {
                                    setSelectedKeys(selection);
                                    onChange(selectionMode === 'multiple' ? 
                                        [...selection].map((key) => {
                                            return getKey(key, items);
                                        })
                                        : getKey(([...selection])[0], items)
                                    );
                                }}
                            >
                                {item => {
                                    return <ListBoxItem id={item.id}>
                                        {item.display ?? item.text}
                                    </ListBoxItem>;
                                }}
                            </ListBox>
                        </Dialog>
                    </Popover>
                </DialogTrigger>
            }
            <Button
                isDisabled={!inlineClear || disabled}
                type="button"
                className="clear-button"
                aria-label="Clear"
                onPress={() => {
                    onChange(selectionMode === 'multiple' ? [] : undefined);
                    setSelectedKeys(new Set([]))
                }}
            >
                ✕
            </Button> 
        </Group>
    </div>;
}
