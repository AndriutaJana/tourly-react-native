import { apiGet, apiPost, apiDelete } from "./backendClient";

export function getWishlist() {
  return apiGet("/api/wishlist");
}

export function upsertWishlistItem(item) {
  return apiPost("/api/wishlist", item);
}

export function deleteWishlistItem(xid) {
  return apiDelete(`/api/wishlist/${encodeURIComponent(String(xid))}`);
}

export function clearWishlist() {
  return apiDelete("/api/wishlist");
}
