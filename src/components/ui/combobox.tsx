"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

type ComboboxContextValue = {
  autoHighlight?: boolean
  filteredItems: unknown[]
  highlightedIndex: number
  multiple?: boolean
  open: boolean
  query: string
  selectedValues: string[]
  setHighlightedIndex: (index: number) => void
  setOpen: (open: boolean) => void
  setQuery: (query: string) => void
  selectValue: (value: string) => void
  removeValue: (value: string) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null)

function useComboboxContext() {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("Combobox components must be used inside <Combobox>.")
  return context
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement>(null)
}

function Combobox({
  autoHighlight,
  children,
  className,
  defaultValue,
  itemToString,
  items,
  multiple,
  onValueChange,
  value,
}: {
  autoHighlight?: boolean
  children: React.ReactNode
  className?: string
  defaultValue?: string[]
  itemToString?: (item: unknown) => string
  items: unknown[]
  multiple?: boolean
  onValueChange?: (value: string[]) => void
  value?: string[]
}) {
  const [internalValue, setInternalValue] = React.useState<string[]>(defaultValue || [])
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const selectedValues = value ?? internalValue
  const stringify = itemToString || ((item: unknown) => String(item))

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const itemValue = String(item)
      if (multiple && selectedValues.includes(itemValue)) return false
      if (!normalizedQuery) return true
      return stringify(item).toLowerCase().includes(normalizedQuery)
    })
  }, [items, multiple, query, selectedValues, stringify])

  React.useEffect(() => {
    setHighlightedIndex(autoHighlight && filteredItems.length ? 0 : -1)
  }, [autoHighlight, filteredItems.length])

  function commit(nextValue: string[]) {
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  function selectValue(next: string) {
    if (!next) return
    if (multiple) {
      commit(selectedValues.includes(next) ? selectedValues : [...selectedValues, next])
      setQuery("")
      setOpen(true)
      return
    }
    commit([next])
    setQuery("")
    setOpen(false)
  }

  function removeValue(next: string) {
    commit(selectedValues.filter((item) => item !== next))
  }

  React.useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  return (
    <ComboboxContext.Provider
      value={{
        autoHighlight,
        filteredItems,
        highlightedIndex,
        multiple,
        open,
        query,
        selectedValues,
        setHighlightedIndex,
        setOpen,
        setQuery,
        selectValue,
        removeValue,
      }}
    >
      <div ref={rootRef} className={cn("relative", className)}>{children}</div>
    </ComboboxContext.Provider>
  )
}

const ComboboxChips = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useComboboxContext()

  return (
    <div
      ref={ref}
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className
      )}
      onClick={(event) => {
        setOpen(true)
        onClick?.(event)
      }}
      {...props}
    />
  )
})
ComboboxChips.displayName = "ComboboxChips"

function ComboboxValue({
  children,
}: {
  children: (values: string[]) => React.ReactNode
}) {
  const { selectedValues } = useComboboxContext()
  return children(selectedValues)
}

function ComboboxChip({
  children,
  className,
  value,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { value?: string }) {
  const { removeValue } = useComboboxContext()
  const removableValue = value ?? (typeof children === "string" ? children : "")

  return (
    <span
      data-slot="combobox-chip"
      className={cn(
        "inline-flex h-5 max-w-full items-center gap-1 rounded-4xl bg-secondary px-2 text-xs font-medium text-secondary-foreground",
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {removableValue ? (
        <button
          type="button"
          className="rounded-full text-muted-foreground hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation()
            removeValue(removableValue)
          }}
          aria-label={`Remove ${children}`}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )
}

function ComboboxChipsInput({
  className,
  placeholder,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const {
    filteredItems,
    highlightedIndex,
    query,
    selectedValues,
    setHighlightedIndex,
    setOpen,
    setQuery,
    selectValue,
    removeValue,
  } = useComboboxContext()

  return (
    <input
      data-slot="combobox-chips-input"
      className={cn(
        "h-5 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground",
        className
      )}
      value={query}
      placeholder={selectedValues.length ? "" : placeholder}
      onChange={(event) => {
        setQuery(event.target.value)
        setOpen(true)
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Backspace" && !query && selectedValues.length) {
          removeValue(selectedValues[selectedValues.length - 1])
        }
        if (event.key === "ArrowDown") {
          event.preventDefault()
          setOpen(true)
          setHighlightedIndex(Math.min(highlightedIndex + 1, filteredItems.length - 1))
        }
        if (event.key === "ArrowUp") {
          event.preventDefault()
          setHighlightedIndex(Math.max(highlightedIndex - 1, 0))
        }
        if (event.key === "Enter" && filteredItems[highlightedIndex] !== undefined) {
          event.preventDefault()
          selectValue(String(filteredItems[highlightedIndex]))
        }
        if (event.key === "Escape") {
          setOpen(false)
        }
      }}
      {...props}
    />
  )
}

function ComboboxContent({
  anchor: _anchor,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  anchor?: React.RefObject<HTMLElement | null>
}) {
  const { open } = useComboboxContext()
  if (!open) return null

  return (
    <div
      data-slot="combobox-content"
      className={cn(
        "absolute left-0 top-[calc(100%+4px)] z-50 max-h-72 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ComboboxEmpty({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { filteredItems } = useComboboxContext()
  if (filteredItems.length) return null
  return (
    <div className={cn("px-2 py-3 text-center text-sm text-muted-foreground", className)} {...props}>
      {children}
    </div>
  )
}

function ComboboxList({
  children,
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  children: (item: unknown, index: number) => React.ReactNode
}) {
  const { filteredItems } = useComboboxContext()
  return (
    <div className={cn("max-h-72 overflow-y-auto p-1", className)} {...props}>
      {filteredItems.map((item, index) => children(item, index))}
    </div>
  )
}

function ComboboxItem({
  children,
  className,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { highlightedIndex, filteredItems, selectedValues, selectValue, setHighlightedIndex } = useComboboxContext()
  const index = filteredItems.findIndex((item) => String(item) === value)
  const selected = selectedValues.includes(value)

  return (
    <div
      role="option"
      aria-selected={selected}
      data-highlighted={index === highlightedIndex ? "" : undefined}
      data-slot="combobox-item"
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onMouseEnter={() => setHighlightedIndex(index)}
      onMouseDown={(event) => {
        event.preventDefault()
        selectValue(value)
      }}
      {...props}
    >
      {children}
      {selected ? <Check className="absolute right-2 size-4" /> : null}
    </div>
  )
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
}
