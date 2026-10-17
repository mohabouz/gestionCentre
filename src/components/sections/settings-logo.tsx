"use client";




export function LogoDropzone({
  logo,
  onChange,
  className = "",
}: {
  logo: string;
  onChange: (logo: string) => void;
  className?: string;
}) {
  const readFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  return (
    <div className={`logo-dropzone ${className}`}>
      <span className="mb-2 block text-xs font-bold text-[#64786c]">
        شعار المؤسسة
      </span>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          readFile(event.dataTransfer.files[0]);
        }}
        className="flex min-h-32 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#c3cbf7] bg-[#f5f7ff] p-4 text-center hover:border-[#5054c0]"
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => readFile(event.target.files?.[0])}
        />
        {logo ? (
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="شعار المؤسسة"
              className="h-20 w-20 rounded-xl object-contain"
            />
            <span className="text-xs font-bold text-[#5054c0]">
              اسحب شعاراً جديداً أو انقر للاستبدال
            </span>
          </div>
        ) : (
          <div className="text-xs text-[#6c6c6c]">
            <span className="block text-2xl text-[#5054c0]">＋</span>اسحب الشعار
            هنا أو انقر لاختيار صورة
          </div>
        )}
      </label>
      {logo && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-xs font-bold text-[#a08500]"
        >
          إزالة الشعار
        </button>
      )}
    </div>
  );
}
