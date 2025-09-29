import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={typeof window !== 'undefined' && window.innerWidth < 1024 ? "bottom-center" : "bottom-right"}
      offset={typeof window !== 'undefined' && window.innerWidth < 1024 ? "88px" : "16px"} // Above mobile nav on small screens, normal on desktop
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[blueviolet] group-[.toaster]:text-white group-[.toaster]:border-border group-[.toaster]:shadow-toast group-[.toaster]:drop-shadow-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
