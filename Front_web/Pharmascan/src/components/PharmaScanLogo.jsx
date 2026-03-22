export default function PharmaScanLogo({ className = "", variant = "default" }) {
  // Variant pour sidebar (avec cœur) ou login (avec scan)
  const isSidebar = variant === "sidebar"
  
  // Chemin vers le logo
  const logoPath = "/logo.png"
  
  return (
    <div className={`flex flex-col ${isSidebar ? 'items-center justify-center w-full' : 'items-center'} ${className}`}>
      <img 
        src={logoPath} 
        alt="PharmaScan Logo" 
        className={isSidebar ? "h-14 w-auto max-w-full object-contain" : "h-32 w-auto"}
        style={{ objectFit: 'contain' }}
      />
    </div>
  )
}
