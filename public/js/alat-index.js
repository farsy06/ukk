document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("alatSearchInput");
  const clearButton = document.getElementById("alatSearchClear");
  const kategoriFilter = document.getElementById("alatKategoriFilter");
  const items = Array.from(document.querySelectorAll("#alatGrid .alat-item"));

  if (!items.length) {
    return;
  }

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const applyFilters = () => {
    const keyword = normalize(searchInput ? searchInput.value : "");
    const selectedCategory = kategoriFilter ? kategoriFilter.value : "";

    items.forEach((item) => {
      const nama = normalize(item.getAttribute("data-nama"));
      const kategori = item.getAttribute("data-kategori") || "";
      const matchesName = !keyword || nama.includes(keyword);
      const matchesCategory =
        !selectedCategory || kategori === selectedCategory;

      item.classList.toggle("d-none", !(matchesName && matchesCategory));
    });
  };

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (kategoriFilter) {
    kategoriFilter.addEventListener("change", applyFilters);
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      if (kategoriFilter) {
        kategoriFilter.value = "";
      }
      applyFilters();
    });
  }

  applyFilters();
});
