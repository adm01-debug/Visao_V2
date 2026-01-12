# 📚 Component Library Reference

## Layout Components

### Container
```tsx
<Container size="md">Content</Container>
```

### Stack / HStack / VStack
```tsx
<VStack gap={4}>
  <div>Item 1</div>
  <div>Item 2</div>
</VStack>
```

## Data Display

### Card
```tsx
<Card hover>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### StatsCard
```tsx
<StatsCard title="Revenue" value="$12,345" change={5.2} />
```

### Table
```tsx
<Table data={data} columns={[
  { key: 'name', header: 'Name' },
  { key: 'age', header: 'Age' }
]} />
```

### Badge / Chip
```tsx
<Badge variant="success">Active</Badge>
<Chip label="Tag" onRemove={() => {}} />
```

## Form Controls

### Input
```tsx
<Input placeholder="Enter text..." />
```

### Select
```tsx
<Select
  value={value}
  onChange={setValue}
  options={[{ value: '1', label: 'Option 1' }]}
/>
```

### Checkbox
```tsx
<Checkbox checked={checked} onChange={setChecked} label="Accept" />
```

### Switch
```tsx
<Switch checked={enabled} onChange={setEnabled} />
```

### RadioGroup
```tsx
<RadioGroup value={value} onChange={setValue} name="options">
  <Radio value="a" label="Option A" />
  <Radio value="b" label="Option B" />
</RadioGroup>
```

### Slider
```tsx
<Slider value={50} onChange={setValue} min={0} max={100} />
```

### DatePicker
```tsx
<DatePicker value={date} onChange={setDate} />
```

### FileUpload
```tsx
<FileUpload onFilesChange={setFiles} multiple />
```

## Navigation

### Breadcrumb
```tsx
<Breadcrumb items={[
  { label: 'Home', href: '/' },
  { label: 'Page' }
]} />
```

### Pagination
```tsx
<Pagination currentPage={1} totalPages={10} onPageChange={setPage} />
```

### Tabs
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content</TabsContent>
</Tabs>
```

## Feedback

### Toast
```tsx
const { toast } = useToast();
toast.success('Success!');
```

### Alert
```tsx
<Alert variant="error" title="Error">Message</Alert>
```

### Skeleton
```tsx
<Skeleton variant="text" width={200} />
```

### ProgressBar
```tsx
<ProgressBar value={75} showLabel />
```

### CircularProgress
```tsx
<CircularProgress value={75} />
```

## Overlays

### Modal
```tsx
<Modal isOpen={isOpen} onClose={close} title="Title">
  Content
</Modal>
```

### Drawer
```tsx
<Drawer isOpen={isOpen} onClose={close} position="right">
  Content
</Drawer>
```

### Tooltip
```tsx
<Tooltip content="Tooltip text">
  <button>Hover me</button>
</Tooltip>
```

### Dropdown
```tsx
<Dropdown trigger={<button>Menu</button>}>
  <DropdownItem onClick={handleClick}>Item 1</DropdownItem>
</Dropdown>
```

## Other

### Timeline
```tsx
<Timeline items={[
  { id: '1', title: 'Event 1', date: '2026-01-01' }
]} />
```

### Stepper
```tsx
<Stepper steps={steps} currentStep={1} />
```

### Rating
```tsx
<Rating value={4} onChange={setValue} />
```

### Accordion
```tsx
<Accordion>
  <AccordionItem value="1">
    <AccordionTrigger value="1">Title</AccordionTrigger>
    <AccordionContent value="1">Content</AccordionContent>
  </AccordionItem>
</Accordion>
```

---

*VIS-O Component Library - January 2026*
