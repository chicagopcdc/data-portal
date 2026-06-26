import PropTypes from 'prop-types';
import './TopBarMenu.css';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.buttonIcon
 * @param {React.ReactNode | React.ReactNode[]} props.children
 * @param {string} [props.title]
 */
function TopBarMenu({ 
  buttonIcon,
  children,
  title,
  isOpen,
  onToggle,
  onClose,
}) {
  function handleMenuBlur(e) {
    if (isOpen && !e.currentTarget.contains(e.relatedTarget)) {
      onClose();
    }
  }
  function toggleMenu() {
    setShowMenu((s) => !s);
  }
  return (
    <span
      className='top-bar-menu'
      data-tour-profile-menu={title === 'Profile' ? true : undefined}
      onBlur={handleMenuBlur}
    >
      <button
        data-menu-active={isOpen}
        onClick={onToggle}
        title={title}
        type='button'
      >
        {buttonIcon}
      </button>
      {isOpen && <ul className='top-bar-menu__items'>{children}</ul>}
    </span>
  );
}

TopBarMenu.propTypes = {
  buttonIcon: PropTypes.node.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
  title: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/** @param {{ children: React.ReactNode }} children */
function Item({ children }) {
  return <li className='top-bar-menu__item'>{children}</li>;
}

Item.propTypes = {
  children: PropTypes.node,
};

TopBarMenu.Item = Item;
export default TopBarMenu;
