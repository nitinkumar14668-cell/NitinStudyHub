import React, { createContext, useContext, useState, useEffect } from 'react';
import { Note } from '../types';
import toast from 'react-hot-toast';

interface CartContextType {
  cart: Note[];
  addToCart: (note: Note) => void;
  removeFromCart: (noteId: string) => void;
  clearCart: () => void;
  isInCart: (noteId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Note[]>(() => {
    const saved = localStorage.getItem('nitin_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('nitin_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (note: Note) => {
    setCart((prev) => {
      if (prev.find((item) => item.id === note.id)) {
        toast.error('Already in cart');
        return prev;
      }
      toast.success('Added to cart');
      return [...prev, note];
    });
  };

  const removeFromCart = (noteId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== noteId));
    toast.success('Removed from cart');
  };

  const clearCart = () => {
    setCart([]);
  };

  const isInCart = (noteId: string) => {
    return cart.some((item) => item.id === noteId);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
