import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
    <Link to="/" className="hover:text-foreground"><Home className="w-4 h-4" /></Link>
    {items.map((item, i) => (
      <React.Fragment key={i}>
        <ChevronRight className="w-4 h-4" />
        {item.href ? (
          <Link to={item.href} className="hover:text-foreground">{item.label}</Link>
        ) : (
          <span className="text-foreground font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export default Breadcrumbs;
