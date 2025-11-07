import React from "react";
import { HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTextProps {
  text: string;
  linkTo?: string;
  linkText?: string;
  className?: string;
}

export function HelpText({ text, linkTo, linkText, className = "" }: HelpTextProps) {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    if (linkTo) {
      e.preventDefault();
      // Extract the route and hash from linkTo (format: /#/manual#section)
      const match = linkTo.match(/\/#\/([^#]+)(?:#(.+))?/);
      if (match) {
        const route = match[1];
        const hash = match[2];
        // Navigate to the route
        navigate(`/${route}`);
        // If there's a hash, scroll to it after navigation completes
        if (hash) {
          setTimeout(() => {
            const element = document.getElementById(hash);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            // Update URL hash without triggering navigation
            if (window.history.replaceState) {
              window.history.replaceState(null, '', `#/${route}#${hash}`);
            }
          }, 300);
        }
      } else {
        navigate(linkTo);
      }
    }
  };

  return (
    <div className={`flex items-start gap-1 text-xs text-muted-foreground ${className}`}>
      <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
      <span>
        {text}
        {linkTo && (
          <>
            {" "}
            <a 
              href={linkTo} 
              onClick={handleClick}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              {linkText || "Learn more"}
            </a>
          </>
        )}
      </span>
    </div>
  );
}

interface HelpTooltipProps {
  content: string;
  linkTo?: string;
  children: React.ReactNode;
}

export function HelpTooltip({ content, linkTo, children }: HelpTooltipProps) {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    if (linkTo) {
      e.preventDefault();
      const match = linkTo.match(/\/#\/([^#]+)(?:#(.+))?/);
      if (match) {
        const route = match[1];
        const hash = match[2];
        navigate(`/${route}`);
        if (hash) {
          setTimeout(() => {
            const element = document.getElementById(hash);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (window.history.replaceState) {
              window.history.replaceState(null, '', `#/${route}#${hash}`);
            }
          }, 300);
        }
      } else {
        navigate(linkTo);
      }
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            {children}
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">
            {content}
            {linkTo && (
              <>
                {" "}
                <a href={linkTo} onClick={handleClick} className="text-blue-300 hover:underline cursor-pointer">
                  Learn more
                </a>
              </>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

